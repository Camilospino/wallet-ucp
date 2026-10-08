const {
  app, request, pool, resetDatabase, createUserAndLogin, login,
  getBalance, getCardBalances, countRows
} = require('../setup/helpers');

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const deposit = (token, body) =>
  request(app).post('/api/wallets/deposit').set(auth(token)).send(body);
const withdraw = (token, body) =>
  request(app).post('/api/wallets/withdraw').set(auth(token)).send(body);
const transfer = (token, body) =>
  request(app).post('/api/transfers').set(auth(token)).send(body);

/** The invariant of the money model: wallet balance = credit + debit. */
const expectWalletMatchesCards = async ({ user, wallet }) => {
  const cards = await getCardBalances(user.id);
  expect(await getBalance(wallet.id)).toBe(Math.round((cards.CREDIT + cards.DEBIT) * 100) / 100);
};

describe('Tarjetas del usuario', () => {
  beforeEach(resetDatabase);

  it('el registro crea una tarjeta de crédito y una de débito en 0', async () => {
    await request(app).post('/api/auth/register').send({
      nombre: 'Nuevo', apellido: 'Usuario', email: 'nuevo@test.com', password: 'Test1234!'
    }).expect(201);
    const { token } = await login('nuevo@test.com', 'Test1234!');

    const res = await request(app).get('/api/cards').set(auth(token)).expect(200);

    expect(res.body.data.cards).toHaveLength(2);
    expect(res.body.data.cards.map((c) => [c.tipo, c.saldo])).toEqual([['CREDIT', 0], ['DEBIT', 0]]);
    for (const card of res.body.data.cards) {
      expect(card.ultimos_digitos).toMatch(/^\d{4}$/);
    }
  });

  it('lista las 2 tarjetas con su saldo, y solo las propias', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 25000, saldoCredito: 40000 });
    await createUserAndLogin({ email: 'b@test.com', saldo: 999 });

    const res = await request(app).get('/api/cards').set(auth(a.token)).expect(200);

    expect(res.body.data.cards).toEqual([
      expect.objectContaining({ id: a.credit.id, tipo: 'CREDIT', saldo: 40000 }),
      expect.objectContaining({ id: a.debit.id, tipo: 'DEBIT', saldo: 25000 })
    ]);
  });

  it('los movimientos recientes indican la tarjeta usada', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com' });
    await deposit(a.token, { amount: 500, cardId: a.debit.id }).expect(200);

    const res = await request(app).get('/api/wallet').set(auth(a.token)).expect(200);

    expect(res.body.data.recentMovements[0]).toMatchObject({
      tipo: 'CREDIT', tarjeta_id: a.debit.id, tarjeta_tipo: 'DEBIT', tarjeta_ultimos_digitos: '1881'
    });
  });

  it('GET /api/wallet incluye las tarjetas y el saldo total', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 25000, saldoCredito: 40000 });

    const res = await request(app).get('/api/wallet').set(auth(a.token)).expect(200);

    expect(res.body.data.wallet.saldo).toBe(65000);
    expect(res.body.data.cards).toHaveLength(2);
  });
});

describe('Depósitos y retiros por tarjeta', () => {
  beforeEach(resetDatabase);

  it('deposita en la tarjeta elegida sin tocar la otra', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 1000 });

    const res = await deposit(a.token, { amount: 5000, cardId: a.credit.id }).expect(200);

    expect(res.body.data.card).toMatchObject({ id: a.credit.id, saldo: 5000 });
    expect(res.body.data.wallet.saldo).toBe(6000);
    expect(res.body.data.transaction.tarjeta_destino_id).toBe(a.credit.id);
    expect(await getCardBalances(a.user.id)).toEqual({ CREDIT: 5000, DEBIT: 1000 });
    await expectWalletMatchesCards(a);
  });

  it('sin cardId usa la tarjeta de débito (compatibilidad con la API anterior)', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 0 });

    await deposit(a.token, { amount: 300 }).expect(200);
    await withdraw(a.token, { amount: 100 }).expect(200);

    expect(await getCardBalances(a.user.id)).toEqual({ CREDIT: 0, DEBIT: 200 });
    await expectWalletMatchesCards(a);
  });

  it('retira de la tarjeta elegida', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 1000, saldoCredito: 8000 });

    const res = await withdraw(a.token, { amount: 3000, cardId: a.credit.id }).expect(200);

    expect(res.body.data.transaction.tarjeta_origen_id).toBe(a.credit.id);
    expect(await getCardBalances(a.user.id)).toEqual({ CREDIT: 5000, DEBIT: 1000 });
    await expectWalletMatchesCards(a);
  });

  it('el saldo de la OTRA tarjeta no cubre un retiro', async () => {
    // 1000 in credit, 50000 in debit: the wallet has 51000 but credit cannot pay 2000.
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 50000, saldoCredito: 1000 });

    const res = await withdraw(a.token, { amount: 2000, cardId: a.credit.id }).expect(400);

    expect(res.body.error).toBe('INSUFFICIENT_BALANCE');
    expect(res.body.message).toBe('Saldo insuficiente en la tarjeta de crédito');
    expect(await getCardBalances(a.user.id)).toEqual({ CREDIT: 1000, DEBIT: 50000 });
    expect(await getBalance(a.wallet.id)).toBe(51000);
  });

  it('rechaza la tarjeta de otro usuario sin mover dinero', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 0 });
    const b = await createUserAndLogin({ email: 'b@test.com', saldo: 0 });

    const res = await deposit(a.token, { amount: 5000, cardId: b.debit.id }).expect(404);

    expect(res.body.error).toBe('CARD_NOT_FOUND');
    expect(await getCardBalances(a.user.id)).toEqual({ CREDIT: 0, DEBIT: 0 });
    expect(await getCardBalances(b.user.id)).toEqual({ CREDIT: 0, DEBIT: 0 });
    expect(await countRows('transacciones')).toBe(0);
    expect(await countRows('movimientos')).toBe(0);
  });

  it.each([['texto', 'abc'], ['cero', 0], ['negativo', -1], ['decimal', 1.5]])(
    'rechaza un cardId %s con 422',
    async (_label, cardId) => {
      const a = await createUserAndLogin({ email: 'a@test.com', saldo: 1000 });
      await deposit(a.token, { amount: 100, cardId }).expect(422);
    }
  );
});

describe('Transferencias por tarjeta', () => {
  beforeEach(resetDatabase);

  it('sale de la tarjeta elegida y llega a la tarjeta elegida del destinatario', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 1000, saldoCredito: 10000 });
    const b = await createUserAndLogin({ email: 'b@test.com', saldo: 500 });

    const res = await transfer(a.token, {
      recipientEmail: 'b@test.com', amount: 3000, cardId: a.credit.id, recipientCardType: 'CREDIT'
    }).expect(200);

    expect(res.body.data.card).toMatchObject({ id: a.credit.id, saldo: 7000 });
    expect(await getCardBalances(a.user.id)).toEqual({ CREDIT: 7000, DEBIT: 1000 });
    expect(await getCardBalances(b.user.id)).toEqual({ CREDIT: 3000, DEBIT: 500 });
    await expectWalletMatchesCards(a);
    await expectWalletMatchesCards(b);
  });

  it('sin recipientCardType llega a la tarjeta de débito del destinatario', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 5000 });
    const b = await createUserAndLogin({ email: 'b@test.com', saldo: 0 });

    await transfer(a.token, { recipientEmail: 'b@test.com', amount: 1200 }).expect(200);

    expect(await getCardBalances(b.user.id)).toEqual({ CREDIT: 0, DEBIT: 1200 });
  });

  it('rechaza la transferencia si la tarjeta de origen no alcanza', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 100000, saldoCredito: 100 });
    const b = await createUserAndLogin({ email: 'b@test.com', saldo: 0 });

    const res = await transfer(a.token, {
      recipientEmail: 'b@test.com', amount: 500, cardId: a.credit.id
    }).expect(400);

    expect(res.body.error).toBe('INSUFFICIENT_BALANCE');
    expect(await getCardBalances(a.user.id)).toEqual({ CREDIT: 100, DEBIT: 100000 });
    expect(await getCardBalances(b.user.id)).toEqual({ CREDIT: 0, DEBIT: 0 });
  });

  it('rechaza un tipo de tarjeta de destino inválido con 422', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 5000 });
    await createUserAndLogin({ email: 'b@test.com' });

    await transfer(a.token, {
      recipientEmail: 'b@test.com', amount: 100, recipientCardType: 'PREPAGO'
    }).expect(422);
  });

  it('cada parte ve solo su propia tarjeta, nunca la del otro', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldoCredito: 10000 });
    const b = await createUserAndLogin({ email: 'b@test.com' });

    const res = await transfer(a.token, {
      recipientEmail: 'b@test.com', amount: 3000, cardId: a.credit.id, recipientCardType: 'DEBIT'
    }).expect(200);
    const txId = res.body.data.transaction.id;

    // The sender's response never carries the recipient's card id.
    expect(res.body.data.transaction).not.toHaveProperty('tarjeta_destino_id');

    // Sender: list and detail show the card it paid with.
    const historyA = await request(app).get('/api/transactions').set(auth(a.token)).expect(200);
    expect(historyA.body.data.transactions[0]).toMatchObject({
      tarjeta_tipo: 'CREDIT', tarjeta_ultimos_digitos: '4242'
    });
    const detailA = await request(app).get(`/api/transactions/${txId}`).set(auth(a.token)).expect(200);
    expect(detailA.body.data.card.id).toBe(a.credit.id);
    expect(detailA.body.data.movements).toHaveLength(1);
    expect(detailA.body.data.movements[0].wallet_id).toBe(a.wallet.id);

    // Recipient: sees the card it received on (its debit), not the sender's.
    const historyB = await request(app).get('/api/transactions').set(auth(b.token)).expect(200);
    const rowB = historyB.body.data.transactions[0];
    expect(rowB).toMatchObject({ tarjeta_tipo: 'DEBIT', tarjeta_ultimos_digitos: '1881' });
    expect(rowB).not.toHaveProperty('tarjeta_origen_id');
    expect(rowB).not.toHaveProperty('tarjeta_destino_id');

    const detailB = await request(app).get(`/api/transactions/${txId}`).set(auth(b.token)).expect(200);
    expect(detailB.body.data.card.id).toBe(b.debit.id);
    expect(detailB.body.data.transaction).not.toHaveProperty('tarjeta_origen_id');
    // The sender's movement (with the sender's balances) is not exposed.
    expect(detailB.body.data.movements.map((m) => m.wallet_id)).toEqual([b.wallet.id]);
  });
});

describe('Consistencia del dinero bajo concurrencia', () => {
  beforeEach(resetDatabase);

  it('billetera = suma de tarjetas y el dinero total se conserva', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 20000, saldoCredito: 20000 });
    const b = await createUserAndLogin({ email: 'b@test.com', saldo: 20000, saldoCredito: 20000 });

    const ops = [];
    for (let i = 0; i < 6; i++) {
      for (const [me, otherEmail] of [[a, 'b@test.com'], [b, 'a@test.com']]) {
        ops.push(deposit(me.token, { amount: 700, cardId: me.credit.id }));
        ops.push(withdraw(me.token, { amount: 900, cardId: me.debit.id }));
        ops.push(transfer(me.token, {
          recipientEmail: otherEmail, amount: 1500, cardId: me.credit.id, recipientCardType: 'DEBIT'
        }));
        ops.push(transfer(me.token, {
          recipientEmail: otherEmail, amount: 400, cardId: me.debit.id, recipientCardType: 'CREDIT'
        }));
      }
    }
    const results = await Promise.all(ops);

    // Every rejection, if any, must be a clean business error.
    for (const res of results) {
      if (res.status !== 200) expect(res.body.error).toBe('INSUFFICIENT_BALANCE');
    }

    await expectWalletMatchesCards(a);
    await expectWalletMatchesCards(b);

    // Money only enters by deposits and leaves by withdrawals; transfers
    // just move it. So the total must match exactly.
    const deposited = results.filter((r, i) => r.status === 200 && i % 4 === 0).length * 700;
    const withdrawn = results.filter((r, i) => r.status === 200 && i % 4 === 1).length * 900;
    const total = (await getBalance(a.wallet.id)) + (await getBalance(b.wallet.id));
    expect(total).toBe(80000 + deposited - withdrawn);

    // No card ever went negative (the CHECK constraint would have aborted).
    const { rows } = await pool.query('SELECT MIN(saldo)::float AS min FROM tarjetas');
    expect(rows[0].min).toBeGreaterThanOrEqual(0);
  });
});
