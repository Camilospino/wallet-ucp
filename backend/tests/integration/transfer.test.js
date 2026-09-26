const {
  app, request, pool, resetDatabase, createUserAndLogin, getBalance, countRows
} = require('../setup/helpers');

describe('POST /api/transfers', () => {
  beforeEach(resetDatabase);

  const setupPair = async () => {
    const origen = await createUserAndLogin({ email: 'origen@test.com', saldo: 100000 });
    const destino = await createUserAndLogin({ email: 'destino@test.com', saldo: 20000 });
    return { origen, destino };
  };

  it('mueve el dinero entre las dos billeteras', async () => {
    const { origen, destino } = await setupPair();

    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${origen.token}`)
      .send({ recipientEmail: 'destino@test.com', amount: 30000 })
      .expect(200);

    expect(res.body.data.transaction.tipo).toBe('TRANSFER');
    expect(res.body.data.transaction.estado).toBe('COMPLETED');
    expect(await getBalance(origen.wallet.id)).toBe(70000);
    expect(await getBalance(destino.wallet.id)).toBe(50000);
  });

  it('genera exactamente 2 movimientos (debit + credit)', async () => {
    const { origen } = await setupPair();
    const before = await countRows('movimientos');

    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${origen.token}`)
      .send({ recipientEmail: 'destino@test.com', amount: 1000 })
      .expect(200);

    expect(await countRows('movimientos')).toBe(before + 2);
  });

  it('rechaza transferir a si mismo con 400', async () => {
    const { origen } = await setupPair();

    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${origen.token}`)
      .send({ recipientEmail: 'origen@test.com', amount: 100 })
      .expect(400);

    expect(res.body.error).toBe('TRANSFER_TO_SELF');
  });

  it('rechaza destinatario inexistente con 404', async () => {
    const { origen } = await setupPair();

    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${origen.token}`)
      .send({ recipientEmail: 'nadie@test.com', amount: 100 })
      .expect(404);
  });

  it('rechaza saldo insuficiente con 400 y no mueve dinero', async () => {
    const { origen, destino } = await setupPair();

    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${origen.token}`)
      .send({ recipientEmail: 'destino@test.com', amount: 999999 })
      .expect(400);

    expect(res.body.error).toBe('INSUFFICIENT_BALANCE');
    expect(await getBalance(origen.wallet.id)).toBe(100000);
    expect(await getBalance(destino.wallet.id)).toBe(20000);
  });

  it('rechaza transferir a un usuario bloqueado con 403', async () => {
    const { origen, destino } = await setupPair();
    await pool.query("UPDATE usuarios SET estado = 'BLOCKED' WHERE id = $1", [destino.user.id]);

    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${origen.token}`)
      .send({ recipientEmail: 'destino@test.com', amount: 100 })
      .expect(403);

    expect(res.body.error).toBe('TRANSFER_TO_BLOCKED');
    expect(await getBalance(origen.wallet.id)).toBe(100000);
  });

  it('rechaza transferir a una billetera bloqueada con 403', async () => {
    const { origen, destino } = await setupPair();
    await pool.query("UPDATE billeteras SET estado = 'BLOCKED' WHERE id = $1", [destino.wallet.id]);

    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${origen.token}`)
      .send({ recipientEmail: 'destino@test.com', amount: 100 })
      .expect(403);

    expect(res.body.error).toBe('WALLET_BLOCKED');
    expect(await getBalance(origen.wallet.id)).toBe(100000);
  });

  it('rechaza monto invalido con 422', async () => {
    const { origen } = await setupPair();

    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${origen.token}`)
      .send({ recipientEmail: 'destino@test.com', amount: 0 })
      .expect(422);

    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${origen.token}`)
      .send({ recipientEmail: 'no-es-email', amount: 100 })
      .expect(422);
  });
});

describe('Atomicidad de la transferencia (ROLLBACK)', () => {
  beforeEach(resetDatabase);

  /**
   * The whole point of this project. We force the transfer to fail AFTER the
   * origin has already been debited, and assert that PostgreSQL rolled the
   * debit back: balances, transaction and movements must all be untouched.
   */
  it('deshace el debito si falla despues de actualizar el origen', async () => {
    const origen = await createUserAndLogin({ email: 'origen@test.com', saldo: 100000 });
    const destino = await createUserAndLogin({ email: 'destino@test.com', saldo: 20000 });

    const movementsBefore = await countRows('movimientos');
    const transactionsBefore = await countRows('transacciones');

    // Simulate a crash right before the credit movement is written, i.e. after
    // the origin balance was already debited and the transaction inserted.
    const movementRepository = require('../../src/repositories/movementRepository');
    const original = movementRepository.create;
    let calls = 0;
    movementRepository.create = jest.fn(async (...args) => {
      calls += 1;
      if (calls === 2) {
        throw new Error('FALLO SIMULADO despues del debito');
      }
      return original(...args);
    });

    let response;
    try {
      // supertest does not throw on a 5xx, it resolves, so inspect the status.
      response = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${origen.token}`)
        .send({ recipientEmail: 'destino@test.com', amount: 40000 });
    } finally {
      movementRepository.create = original;
    }

    expect(response.status).toBe(500);

    // Nothing may have been persisted.
    expect(await getBalance(origen.wallet.id)).toBe(100000);
    expect(await getBalance(destino.wallet.id)).toBe(20000);
    expect(await countRows('transacciones')).toBe(transactionsBefore);
    expect(await countRows('movimientos')).toBe(movementsBefore);
  });

  it('deja el saldo intacto cuando el destino no existe a mitad del proceso', async () => {
    const origen = await createUserAndLogin({ email: 'origen@test.com', saldo: 75000 });

    const before = await getBalance(origen.wallet.id);

    // Force a failure in the middle of the transaction.
    const movementRepository = require('../../src/repositories/movementRepository');
    const original = movementRepository.create;
    movementRepository.create = jest.fn(async () => {
      throw new Error('FALLO SIMULADO');
    });

    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${origen.token}`)
      .send({ recipientEmail: 'nadie@test.com', amount: 1000 })
      .expect(404);

    movementRepository.create = original;

    expect(await getBalance(origen.wallet.id)).toBe(before);
  });
});
