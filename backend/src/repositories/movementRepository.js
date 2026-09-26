const pool = require('../config/database');

// Every function accepts an optional `client` as its LAST argument so it can
// join an open transaction started by the service layer.
const create = async (walletId, transactionId, tipo, monto, saldoAnterior, saldoResultante, client = pool) => {
  const query = `
    INSERT INTO movimientos (wallet_id, transaction_id, tipo, monto, saldo_anterior, saldo_resultante)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [walletId, transactionId, tipo, monto, saldoAnterior, saldoResultante];
  
  const result = await client.query(query, values);
  return result.rows[0];
};

const findByWalletId = async (walletId, limit = 20, offset = 0, client = pool) => {
  const query = `
    SELECT m.*, t.referencia, t.tipo as transaction_tipo, t.estado as transaction_estado
    FROM movimientos m
    JOIN transacciones t ON m.transaction_id = t.id
    WHERE m.wallet_id = $1
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await client.query(query, [walletId, limit, offset]);
  return result.rows;
};

const findByTransactionId = async (transactionId, client = pool) => {
  const query = 'SELECT * FROM movimientos WHERE transaction_id = $1';
  const result = await client.query(query, [transactionId]);
  return result.rows;
};

const countByWalletId = async (walletId, client = pool) => {
  const query = 'SELECT COUNT(*) FROM movimientos WHERE wallet_id = $1';
  const result = await client.query(query, [walletId]);
  return parseInt(result.rows[0].count);
};

module.exports = {
  create,
  findByWalletId,
  findByTransactionId,
  countByWalletId
};
