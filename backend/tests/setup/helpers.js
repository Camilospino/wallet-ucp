const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const pool = require('../../src/config/database');
const { USER_ROLES, WALLET_STATES } = require('../../src/config/constants');

/**
 * Empties every table so each test file starts from a known state.
 * TRUNCATE ... RESTART IDENTITY CASCADE resets the serial sequences too.
 */
const resetDatabase = async () => {
  await pool.query(
    'TRUNCATE TABLE movimientos, transacciones, tarjetas, billeteras, usuarios RESTART IDENTITY CASCADE'
  );
};

/**
 * Creates a user with a wallet and its two cards, mirroring what registration
 * does. Passwords are hashed with the same algorithm as production.
 *
 * `saldo` goes to the DEBIT card and `saldoCredito` to the CREDIT card; the
 * wallet gets their sum, keeping the invariant wallet = sum of its cards.
 */
const createUser = async ({
  nombre = 'Test', apellido = 'Usuario', email, password = 'Test123!',
  rol = USER_ROLES.USER, saldo = 0, saldoCredito = 0
} = {}) => {
  const passwordHash = await bcrypt.hash(password, 4);

  const userResult = await pool.query(
    `INSERT INTO usuarios (nombre, apellido, email, password_hash, estado, rol)
     VALUES ($1, $2, $3, $4, 'ACTIVE', $5)
     RETURNING id, nombre, apellido, email, estado, rol`,
    [nombre, apellido, email, passwordHash, rol]
  );
  const user = userResult.rows[0];

  const walletResult = await pool.query(
    `INSERT INTO billeteras (usuario_id, saldo, estado)
     VALUES ($1, $2, $3)
     RETURNING id, usuario_id, saldo, estado`,
    [user.id, saldo + saldoCredito, WALLET_STATES.ACTIVE]
  );

  const cardsResult = await pool.query(
    `INSERT INTO tarjetas (usuario_id, tipo, marca, ultimos_digitos, saldo)
     VALUES ($1, 'CREDIT', 'VISA', '4242', $2), ($1, 'DEBIT', 'MASTERCARD', '1881', $3)
     RETURNING id, tipo, marca, ultimos_digitos, saldo`,
    [user.id, saldoCredito, saldo]
  );
  const cards = Object.fromEntries(cardsResult.rows.map((card) => [card.tipo, card]));

  return {
    user,
    wallet: walletResult.rows[0],
    credit: cards.CREDIT,
    debit: cards.DEBIT,
    password
  };
};

/** Logs in through the real endpoint and returns the token plus the user. */
const login = async (email, password) => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return { token: res.body.data.token, user: res.body.data.user };
};

/** Creates a user and immediately logs in, for the common case. */
const createUserAndLogin = async (options) => {
  const created = await createUser(options);
  const session = await login(created.user.email, created.password);
  return { ...created, ...session };
};

/** Reads the current balance straight from the database. */
const getBalance = async (walletId) => {
  const { rows } = await pool.query('SELECT saldo FROM billeteras WHERE id = $1', [walletId]);
  return rows[0] ? parseFloat(rows[0].saldo) : null;
};

/** Reads both card balances of a user: { CREDIT, DEBIT }. */
const getCardBalances = async (usuarioId) => {
  const { rows } = await pool.query('SELECT tipo, saldo FROM tarjetas WHERE usuario_id = $1', [usuarioId]);
  return Object.fromEntries(rows.map((row) => [row.tipo, parseFloat(row.saldo)]));
};

/** Counts rows in a table, used to prove a rollback left no residue. */
const countRows = async (table) => {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS total FROM ${table}`);
  return rows[0].total;
};

module.exports = {
  app,
  request,
  pool,
  resetDatabase,
  createUser,
  createUserAndLogin,
  login,
  getBalance,
  getCardBalances,
  countRows
};
