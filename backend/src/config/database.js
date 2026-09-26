const { Pool, types } = require('pg');
const logger = require('../utils/logger');
require('dotenv').config();

// PostgreSQL returns NUMERIC (OID 1700) as a string to preserve precision.
// Every amount crossing the API would then be a string, which breaks numeric
// comparisons in the frontend and makes `saldo > 1000` compare strings.
// Converting at the driver boundary keeps the precision PostgreSQL gives us
// (2 decimals, values well inside the safe-integer range) while letting the
// rest of the app treat money as a number.
types.setTypeParser(1700, (value) => parseFloat(value));
// INT8 (bigint) likewise arrives as a string; counts are safe as numbers.
types.setTypeParser(20, (value) => parseInt(value, 10));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Fail fast instead of hanging forever when PostgreSQL is unreachable.
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
});

pool.on('connect', () => {
  logger.debug('Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  logger.error('Error inesperado en un cliente inactivo de PostgreSQL', {
    error: err.message
  });
  // The pool can no longer be trusted, so the process must be restarted.
  process.exit(-1);
});

module.exports = pool;
