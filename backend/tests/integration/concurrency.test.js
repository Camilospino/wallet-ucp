const {
  app, request, resetDatabase, createUserAndLogin, getBalance, countRows
} = require('../setup/helpers');

/**
 * These tests exercise the concurrency control of the project: SELECT ... FOR
 * UPDATE must serialise operations on the same wallet so no update is lost and
 * no balance can go negative.
 */
describe('Control de concurrencia', () => {
  beforeEach(resetDatabase);

  it('no pierde actualizaciones con depositos simultaneos', async () => {
    const { token, wallet } = await createUserAndLogin({ email: 'concurrent@test.com', saldo: 0 });

    const AMOUNT = 100;
    const CONCURRENT = 20;

    const results = await Promise.all(
      Array.from({ length: CONCURRENT }, () =>
        request(app)
          .post('/api/wallets/deposit')
          .set('Authorization', `Bearer ${token}`)
          .send({ amount: AMOUNT })
      )
    );

    const okCount = results.filter((r) => r.status === 200).length;
    expect(await getBalance(wallet.id)).toBe(okCount * AMOUNT);
  });

  it('nunca deja el saldo en negativo con retiros simultaneos', async () => {
    const { token, wallet } = await createUserAndLogin({ email: 'concurrent@test.com', saldo: 1000 });

    const AMOUNT = 100;
    const CONCURRENT = 30;

    const results = await Promise.all(
      Array.from({ length: CONCURRENT }, () =>
        request(app)
          .post('/api/wallets/withdraw')
          .set('Authorization', `Bearer ${token}`)
          .send({ amount: AMOUNT })
      )
    );

    const okCount = results.filter((r) => r.status === 200).length;
    const insufficient = results.filter(
      (r) => r.status === 400 && r.body.error === 'INSUFFICIENT_BALANCE'
    ).length;

    // Only 10 of 30 withdrawals can succeed against a balance of 1000.
    expect(okCount).toBe(10);
    expect(insufficient).toBe(CONCURRENT - 10);

    const finalBalance = await getBalance(wallet.id);
    expect(finalBalance).toBe(0);
    expect(finalBalance).toBeGreaterThanOrEqual(0);
  });

  it('mantiene la suma de saldos constante en transferencias bidireccionales', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 50000 });
    const b = await createUserAndLogin({ email: 'b@test.com', saldo: 50000 });

    const before = (await getBalance(a.wallet.id)) + (await getBalance(b.wallet.id));

    // Transfers in both directions at once, in opposite lock order.
    await Promise.all([
      request(app).post('/api/transfers').set('Authorization', `Bearer ${a.token}`)
        .send({ recipientEmail: 'b@test.com', amount: 1000 }),
      request(app).post('/api/transfers').set('Authorization', `Bearer ${b.token}`)
        .send({ recipientEmail: 'a@test.com', amount: 2000 })
    ]);

    const after = (await getBalance(a.wallet.id)) + (await getBalance(b.wallet.id));
    expect(after).toBe(before);
  });

  it('el libro mayor siempre cuadra con el saldo', async () => {
    // Start at 0 so every cent of the balance is explained by a movement.
    const { token, wallet } = await createUserAndLogin({ email: 'ledger@test.com', saldo: 0 });

    await Promise.all([
      request(app).post('/api/wallets/deposit').set('Authorization', `Bearer ${token}`)
        .send({ amount: 1000 }),
      request(app).post('/api/wallets/withdraw').set('Authorization', `Bearer ${token}`)
        .send({ amount: 500 }),
      request(app).post('/api/wallets/deposit').set('Authorization', `Bearer ${token}`)
        .send({ amount: 250 }),
      request(app).post('/api/wallets/withdraw').set('Authorization', `Bearer ${token}`)
        .send({ amount: 100 })
    ]);

    const movementsBefore = await countRows('movimientos');
    const { rows } = await (require('../setup/helpers').pool).query(
      `SELECT COALESCE(SUM(CASE WHEN tipo = 'CREDIT' THEN monto ELSE -monto END), 0) AS total
       FROM movimientos WHERE wallet_id = $1`,
      [wallet.id]
    );

    expect(await getBalance(wallet.id)).toBe(650);
    expect(parseFloat(rows[0].total)).toBe(650);
    expect(movementsBefore).toBeGreaterThan(0);
  });
});
