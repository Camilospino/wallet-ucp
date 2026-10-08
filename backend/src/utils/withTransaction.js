const pool = require('../config/database');
const logger = require('./logger');

/**
 * Runs `fn` inside a single SQL transaction on a dedicated client.
 *
 * IMPORTANT: every repository call made inside `fn` must receive that same
 * `client`. If a repository used the shared pool instead, the statements would
 * run on a different connection, so BEGIN/COMMIT/ROLLBACK would not cover them
 * and the `SELECT ... FOR UPDATE` locks would be released immediately.
 */
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logger.error('Falló el ROLLBACK de la transacción', { error: rollbackError.message });
    }
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { withTransaction };
