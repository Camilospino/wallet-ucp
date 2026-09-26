const {
  app, request, resetDatabase, createUserAndLogin, getBalance
} = require('../setup/helpers');

describe('GET /api/wallet', () => {
  beforeEach(resetDatabase);

  it('devuelve el saldo y los movimientos recientes', async () => {
    const { token, wallet } = await createUserAndLogin({ email: 'u1@test.com', saldo: 50000 });

    const res = await request(app)
      .get('/api/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(parseFloat(res.body.data.wallet.saldo)).toBe(50000);
    expect(res.body.data.wallet.id).toBe(wallet.id);
    expect(res.body.data.recentMovements).toEqual([]);
  });

  it('rechaza sin token con 401', async () => {
    await request(app).get('/api/wallet').expect(401);
  });
});

describe('POST /api/wallets/deposit', () => {
  beforeEach(resetDatabase);

  it('aumenta el saldo y registra transaccion y movimiento', async () => {
    const { token, wallet } = await createUserAndLogin({ email: 'u1@test.com', saldo: 10000 });

    const res = await request(app)
      .post('/api/wallets/deposit')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 25000 })
      .expect(200);

    expect(res.body.data.transaction.tipo).toBe('DEPOSIT');
    expect(res.body.data.transaction.estado).toBe('COMPLETED');
    expect(res.body.data.transaction.referencia).toMatch(/^TX-\d{8}-[A-Z0-9]{6}$/);
    expect(await getBalance(wallet.id)).toBe(35000);
  });

  it('acepta montos decimales sin perdida de precision', async () => {
    const { token, wallet } = await createUserAndLogin({ email: 'u1@test.com', saldo: 0 });

    await request(app)
      .post('/api/wallets/deposit')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 0.1 })
      .expect(200);

    await request(app)
      .post('/api/wallets/deposit')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 0.2 })
      .expect(200);

    // 0.1 + 0.2 = 0.30000000000000004 en float; NUMERIC debe dar 0.30
    expect(await getBalance(wallet.id)).toBe(0.3);
  });

  it('rechaza montos no validos con 422 y no altera el saldo', async () => {
    const { token, wallet } = await createUserAndLogin({ email: 'u1@test.com', saldo: 1000 });

    const invalid = [0, -50, 'abc', null];
    for (const amount of invalid) {
      await request(app)
        .post('/api/wallets/deposit')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount })
        .expect(422);
    }

    expect(await getBalance(wallet.id)).toBe(1000);
  });

  it('rechaza sin token con 401', async () => {
    await request(app).post('/api/wallets/deposit').send({ amount: 100 }).expect(401);
  });
});

describe('POST /api/wallets/withdraw', () => {
  beforeEach(resetDatabase);

  it('descuenta del saldo correctamente', async () => {
    const { token, wallet } = await createUserAndLogin({ email: 'u1@test.com', saldo: 100000 });

    const res = await request(app)
      .post('/api/wallets/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 30000 })
      .expect(200);

    expect(res.body.data.transaction.tipo).toBe('WITHDRAW');
    expect(await getBalance(wallet.id)).toBe(70000);
  });

  it('permite retirar exactamente el saldo disponible', async () => {
    const { token, wallet } = await createUserAndLogin({ email: 'u1@test.com', saldo: 10000 });

    await request(app)
      .post('/api/wallets/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 10000 })
      .expect(200);

    expect(await getBalance(wallet.id)).toBe(0);
  });

  it('rechaza retiro mayor al saldo con 400 y no altera el saldo', async () => {
    const { token, wallet } = await createUserAndLogin({ email: 'u1@test.com', saldo: 5000 });

    const res = await request(app)
      .post('/api/wallets/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5001 })
      .expect(400);

    expect(res.body.error).toBe('INSUFFICIENT_BALANCE');
    expect(await getBalance(wallet.id)).toBe(5000);
  });
});
