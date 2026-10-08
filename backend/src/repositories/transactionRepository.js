const pool = require('../config/database');

// Every function accepts an optional `client` as its LAST argument so it can
// join an open transaction started by the service layer.

// Optional filters shared by the listing and count queries. Keeping them in one
// place guarantees the pagination total is computed with the exact same
// predicate as the rows it describes. Values are always bound as parameters.
const FILTER_CLAUSES = [
  ['tipo', 't.tipo ='],
  ['estado', 't.estado ='],
  ['fechaInicio', 't.created_at >='],
  ['fechaFin', 't.created_at <=']
];

const appendFilters = (filters, values) => {
  let sql = '';
  for (const [key, clause] of FILTER_CLAUSES) {
    if (filters[key]) {
      values.push(filters[key]);
      sql += ` AND ${clause} $${values.length}`;
    }
  }
  return sql;
};

// Base listing query: the transaction plus the names of both parties and the
// card involved. `cardOwner` is a SQL expression with the user whose cards may
// be revealed: in a transfer each party only sees its OWN card (the sender the
// one it paid with, the recipient the one it received on), never the other's.
// Without `cardOwner` (admin) no owner filter applies.
const selectWithParties = (cardOwner = null) => {
  const ownerFilter = (alias) => (cardOwner ? ` AND ${alias}.usuario_id = ${cardOwner}` : '');
  return `
    SELECT t.*,
           u_origen.nombre as origen_nombre, u_origen.email as origen_email,
           u_destino.nombre as destino_nombre, u_destino.email as destino_email,
           COALESCE(tj_o.tipo, tj_d.tipo) as tarjeta_tipo,
           COALESCE(tj_o.marca, tj_d.marca) as tarjeta_marca,
           COALESCE(tj_o.ultimos_digitos, tj_d.ultimos_digitos) as tarjeta_ultimos_digitos
    FROM transacciones t
    LEFT JOIN billeteras b_origen ON t.origen_wallet_id = b_origen.id
    LEFT JOIN usuarios u_origen ON b_origen.usuario_id = u_origen.id
    LEFT JOIN billeteras b_destino ON t.destino_wallet_id = b_destino.id
    LEFT JOIN usuarios u_destino ON b_destino.usuario_id = u_destino.id
    LEFT JOIN tarjetas tj_o ON tj_o.id = t.tarjeta_origen_id${ownerFilter('tj_o')}
    LEFT JOIN tarjetas tj_d ON tj_d.id = t.tarjeta_destino_id${ownerFilter('tj_d')}
`;
};

// id breaks ties between rows created in the same instant, so a row can never
// appear on two pages (or on none) while paginating.
const appendPagination = (limit, offset, values) => {
  values.push(limit, offset);
  return ` ORDER BY t.created_at DESC, t.id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;
};

// `tarjetaOrigenId` is the card the money left from (withdrawal, transfer) and
// `tarjetaDestinoId` the card it arrived on (deposit, transfer).
const create = async (
  referencia, origenWalletId, destinoWalletId, tipo, monto, estado,
  descripcion = null, tarjetaOrigenId = null, tarjetaDestinoId = null, client = pool
) => {
  const query = `
    INSERT INTO transacciones
      (referencia, origen_wallet_id, destino_wallet_id, tipo, monto, estado, descripcion, tarjeta_origen_id, tarjeta_destino_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  const values = [
    referencia, origenWalletId, destinoWalletId, tipo, monto, estado,
    descripcion, tarjetaOrigenId, tarjetaDestinoId
  ];

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
  let query = selectWithParties('(SELECT usuario_id FROM billeteras WHERE id = $1)') +
    '    WHERE (t.origen_wallet_id = $1 OR t.destino_wallet_id = $1)';
  query += appendFilters(filters, values);
  query += appendPagination(limit, offset, values);

  const result = await client.query(query, values);
  // t.* still carries the raw card ids of BOTH parties: drop them so the other
  // party's card id never leaves the server.
  return result.rows.map(({ tarjeta_origen_id, tarjeta_destino_id, ...row }) => row);
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
  const values = [];
  // Admin listing: shows the sender's card (origin), or the destination card
  // for deposits, which have no origin.
  let query = selectWithParties() + '    WHERE 1=1';
  query += appendFilters(filters, values);
  query += appendPagination(limit, offset, values);

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
  let query = 'SELECT COUNT(*) FROM transacciones t WHERE 1=1';

  if (filters.walletId !== undefined && filters.walletId !== null) {
    values.push(filters.walletId);
    query += ` AND (t.origen_wallet_id = $${values.length} OR t.destino_wallet_id = $${values.length})`;
  }
  query += appendFilters(filters, values);

  const result = await client.query(query, values);
  return parseInt(result.rows[0].count, 10);
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
