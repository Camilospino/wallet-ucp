const { ERROR_CODES } = require('../config/constants');

// Ids are SERIAL (int4) columns, so anything above this overflows in PostgreSQL.
const MAX_INT4 = 2147483647;

/**
 * Rejects a non-numeric `:id` route param before it reaches the database.
 * Without this, `/api/transactions/abc` made PostgreSQL throw "invalid input
 * syntax for type integer", which surfaced as a 500 instead of a client error.
 */
const validateIdParam = (req, res, next) => {
  const { id } = req.params;
  const value = Number(id);

  if (!/^\d+$/.test(id) || value < 1 || value > MAX_INT4) {
    return res.status(422).json({
      success: false,
      message: 'El id debe ser un número entero positivo',
      error: ERROR_CODES.VALIDATION_ERROR
    });
  }

  next();
};

module.exports = { validateIdParam };
