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
    'TRUNCATE TABLE movimientos, transacciones, billeteras, usuarios RESTART IDENTITY CASCADE'
  );
};

/**
 * Creates a user with a wallet, mirroring what registration does, and returns
 * both records. Passwords are hashed with the same algorithm as production.
 */
const createUser = async ({ nombre = 'Test', apellido = 'Usuario', email, password = 'Test123!', rol = USER_ROLES.USER, saldo = 0 } = {}) => {
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
    [user.id, saldo, WALLET_STATES.ACTIVE]
  );

  return { user, wallet: walletResult.rows[0], password };
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
  countRows
};
