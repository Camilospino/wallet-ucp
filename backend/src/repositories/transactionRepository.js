const pool = require('../config/database');

// Every function accepts an optional `client` as its LAST argument so it can
// join an open transaction started by the service layer.
const create = async (referencia, origenWalletId, destinoWalletId, tipo, monto, estado, descripcion = null, client = pool) => {
  const query = `
    INSERT INTO transacciones (referencia, origen_wallet_id, destino_wallet_id, tipo, monto, estado, descripcion)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [referencia, origenWalletId, destinoWalletId, tipo, monto, estado, descripcion];

  const result = await client.query(query, values);
  return result.rows[0];
};

const findById = async (id, client = pool) => {
  const query = 'SELECT * FROM transacciones WHERE id = $1';
  const result = await client.query(query, [id]);
  return result.rows[0];
};

const findByReference = async (referencia, client = pool) => {
  const query = 'SELECT * FROM transacciones WHERE referencia = $1';
  const result = await client.query(query, [referencia]);
  return result.rows[0];
};

/**
 * Lists transactions for one wallet (origin OR destination) honouring filters.
 */
const findByWalletId = async (walletId, limit = 20, offset = 0, filters = {}, client = pool) => {
  const values = [walletId];
  let paramCount = 1;

  let query = `
    SELECT t.*,
           u_origen.nombre as origen_nombre, u_origen.email as origen_email,
           u_destino.nombre as destino_nombre, u_destino.email as destino_email
    FROM transacciones t
    LEFT JOIN billeteras b_origen ON t.origen_wallet_id = b_origen.id
    LEFT JOIN usuarios u_origen ON b_origen.usuario_id = u_origen.id
    LEFT JOIN billeteras b_destino ON t.destino_wallet_id = b_destino.id
    LEFT JOIN usuarios u_destino ON b_destino.usuario_id = u_destino.id
    WHERE (t.origen_wallet_id = $1 OR t.destino_wallet_id = $1)
  `;

  if (filters.tipo) {
    paramCount++;
    query += ` AND t.tipo = $${paramCount}`;
    values.push(filters.tipo);
  }
  if (filters.estado) {
    paramCount++;
    query += ` AND t.estado = $${paramCount}`;
    values.push(filters.estado);
  }
  if (filters.fechaInicio) {
    paramCount++;
    query += ` AND t.created_at >= $${paramCount}`;
    values.push(filters.fechaInicio);
  }
  if (filters.fechaFin) {
    paramCount++;
    query += ` AND t.created_at <= $${paramCount}`;
    values.push(filters.fechaFin);
  }

  query += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  values.push(limit, offset);

  const result = await client.query(query, values);
  return result.rows;
};

const updateState = async (id, estado, client = pool) => {
  const query = `
    UPDATE transacciones 
    SET estado = $1
    WHERE id = $2
    RETURNING *
  `;
  const result = await client.query(query, [estado, id]);
  return result.rows[0];
};

const getAll = async (limit = 50, offset = 0, filters = {}, client = pool) => {
  let query = `
    SELECT t.*, 
           u_origen.nombre as origen_nombre, u_origen.email as origen_email,
           u_destino.nombre as destino_nombre, u_destino.email as destino_email
    FROM transacciones t
    LEFT JOIN billeteras b_origen ON t.origen_wallet_id = b_origen.id
    LEFT JOIN usuarios u_origen ON b_origen.usuario_id = u_origen.id
    LEFT JOIN billeteras b_destino ON t.destino_wallet_id = b_destino.id
    LEFT JOIN usuarios u_destino ON b_destino.usuario_id = u_destino.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (filters.tipo) {
    paramCount++;
    query += ` AND t.tipo = $${paramCount}`;
    values.push(filters.tipo);
  }

  if (filters.estado) {
    paramCount++;
    query += ` AND t.estado = $${paramCount}`;
    values.push(filters.estado);
  }

  if (filters.fechaInicio) {
    paramCount++;
    query += ` AND t.created_at >= $${paramCount}`;
    values.push(filters.fechaInicio);
  }

  if (filters.fechaFin) {
    paramCount++;
    query += ` AND t.created_at <= $${paramCount}`;
    values.push(filters.fechaFin);
  }

  query += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  values.push(limit, offset);

  const result = await client.query(query, values);
  return result.rows;
};

/**
 * Counts transactions. When `filters.walletId` is set the count is scoped to
 * that wallet using the same predicate as findByWalletId, so the pagination
 * total always matches the rows actually returned. Without it the count is
 * global (used by the admin endpoints).
 */
const count = async (filters = {}, client = pool) => {
  const values = [];
  let paramCount = 0;
  let query = 'SELECT COUNT(*) FROM transacciones t WHERE 1=1';

  if (filters.walletId !== undefined && filters.walletId !== null) {
    paramCount++;
    query += ` AND (t.origen_wallet_id = $${paramCount} OR t.destino_wallet_id = $${paramCount})`;
    values.push(filters.walletId);
  }

  if (filters.tipo) {
    paramCount++;
    query += ` AND t.tipo = $${paramCount}`;
    values.push(filters.tipo);
  }

  if (filters.estado) {
    paramCount++;
    query += ` AND t.estado = $${paramCount}`;
    values.push(filters.estado);
  }

  if (filters.fechaInicio) {
    paramCount++;
    query += ` AND t.created_at >= $${paramCount}`;
    values.push(filters.fechaInicio);
  }

  if (filters.fechaFin) {
    paramCount++;
    query += ` AND t.created_at <= $${paramCount}`;
    values.push(filters.fechaFin);
  }

  const result = await client.query(query, values);
  return parseInt(result.rows[0].count);
};

module.exports = {
  create,
  findById,
  findByReference,
  findByWalletId,
  updateState,
  getAll,
  count
};
