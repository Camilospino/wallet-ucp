const pool = require('../config/database');

// Every function accepts an optional `client` as its LAST argument so it can
// join an open transaction started by the service layer.

// Columns exposed by the API. The table never holds the full card number.
const CARD_COLUMNS = 'id, usuario_id, tipo, marca, ultimos_digitos, saldo, created_at';

const create = async (usuarioId, tipo, marca, ultimosDigitos, saldo = 0, client = pool) => {
  const query = `
    INSERT INTO tarjetas (usuario_id, tipo, marca, ultimos_digitos, saldo)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING ${CARD_COLUMNS}
  `;
  const result = await client.query(query, [usuarioId, tipo, marca, ultimosDigitos, saldo]);
  return result.rows[0];
};

/** Both cards of a user, credit first so the UI always shows them in order. */
const findByUserId = async (usuarioId, client = pool) => {
  const query = `
    SELECT ${CARD_COLUMNS}
    FROM tarjetas
    WHERE usuario_id = $1
    ORDER BY tipo ASC
  `;
  const result = await client.query(query, [usuarioId]);
  return result.rows;
};

/** Returns the card only if it belongs to `usuarioId` (no lock). */
const findByIdForUser = async (id, usuarioId, client = pool) => {
  const query = `SELECT ${CARD_COLUMNS} FROM tarjetas WHERE id = $1 AND usuario_id = $2`;
  const result = await client.query(query, [id, usuarioId]);
  return result.rows[0];
};

/**
 * Locks one of the user's cards by id. Filtering by owner in SQL means a user
 * can never use (or even detect) someone else's card by guessing its id.
 * Requires the transaction's `client`, or the lock is released immediately.
 */
const lockByIdForUser = async (id, usuarioId, client) => {
  const query = `SELECT ${CARD_COLUMNS} FROM tarjetas WHERE id = $1 AND usuario_id = $2 FOR UPDATE`;
  const result = await client.query(query, [id, usuarioId]);
  return result.rows[0];
};

/** Locks the user's card of the given type (CREDIT or DEBIT). */
const lockByUserAndType = async (usuarioId, tipo, client) => {
  const query = `SELECT ${CARD_COLUMNS} FROM tarjetas WHERE usuario_id = $1 AND tipo = $2 FOR UPDATE`;
  const result = await client.query(query, [usuarioId, tipo]);
  return result.rows[0];
};

const updateBalance = async (id, saldo, client = pool) => {
  const query = `
    UPDATE tarjetas
    SET saldo = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING ${CARD_COLUMNS}
  `;
  const result = await client.query(query, [saldo, id]);
  return result.rows[0];
};

module.exports = {
  create,
  findByUserId,
  findByIdForUser,
  lockByIdForUser,
  lockByUserAndType,
  updateBalance
};
