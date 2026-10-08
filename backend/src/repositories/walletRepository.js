const pool = require('../config/database');
const { WALLET_STATES } = require('../config/constants');

/**
 * Every function accepts an optional `client` as its LAST argument.
 * When provided, the query runs on that dedicated connection so it takes part
 * in an open transaction (BEGIN/COMMIT/ROLLBACK). When omitted, the shared
 * pool is used for read-only queries outside a transaction.
 */
const create = async (usuarioId, client = pool) => {
  const query = `
    INSERT INTO billeteras (usuario_id, saldo, estado)
    VALUES ($1, 0.00, $2)
    RETURNING id, usuario_id, saldo, estado, created_at
  `;
  const values = [usuarioId, WALLET_STATES.ACTIVE];

  const result = await client.query(query, values);
  return result.rows[0];
};

const findByUserId = async (usuarioId, client = pool) => {
  const query = 'SELECT * FROM billeteras WHERE usuario_id = $1';
  const result = await client.query(query, [usuarioId]);
  return result.rows[0];
};

/**
 * Fetches the wallets of several users in ONE query, so listing N users does
 * not issue N extra round trips (the classic N+1 problem).
 */
const findByUserIds = async (usuarioIds, client = pool) => {
  if (!usuarioIds.length) return [];
  const query = 'SELECT * FROM billeteras WHERE usuario_id = ANY($1::int[])';
  const result = await client.query(query, [usuarioIds]);
  return result.rows;
};

const findById = async (id, client = pool) => {
  const query = 'SELECT * FROM billeteras WHERE id = $1';
  const result = await client.query(query, [id]);
  return result.rows[0];
};

const updateBalance = async (walletId, newBalance, client = pool) => {
  const query = `
    UPDATE billeteras 
    SET saldo = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, usuario_id, saldo, estado
  `;
  const result = await client.query(query, [newBalance, walletId]);
  return result.rows[0];
};

const updateState = async (walletId, estado, client = pool) => {
  const query = `
    UPDATE billeteras 
    SET estado = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, usuario_id, saldo, estado
  `;
  const result = await client.query(query, [estado, walletId]);
  return result.rows[0];
};

const lockForUpdate = async (walletId, client = pool) => {
  const query = 'SELECT * FROM billeteras WHERE id = $1 FOR UPDATE';
  const result = await client.query(query, [walletId]);
  return result.rows[0];
};

const lockByUserIdForUpdate = async (usuarioId, client = pool) => {
  const query = 'SELECT * FROM billeteras WHERE usuario_id = $1 FOR UPDATE';
  const result = await client.query(query, [usuarioId]);
  return result.rows[0];
};

const getAll = async (limit = 50, offset = 0, client = pool) => {
  const query = `
    SELECT b.id, b.usuario_id, b.saldo, b.estado, b.created_at,
           u.nombre, u.apellido, u.email
    FROM billeteras b
    JOIN usuarios u ON b.usuario_id = u.id
    ORDER BY b.created_at DESC
    LIMIT $1 OFFSET $2
  `;
  const result = await client.query(query, [limit, offset]);
  return result.rows;
};

const count = async (client = pool) => {
  const query = 'SELECT COUNT(*) FROM billeteras';
  const result = await client.query(query);
  return parseInt(result.rows[0].count);
};

module.exports = {
  create,
  findByUserId,
  findByUserIds,
  findById,
  updateBalance,
  updateState,
  lockForUpdate,
  lockByUserIdForUpdate,
  getAll,
  count
};
