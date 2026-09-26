const { ERROR_CODES } = require('../config/constants');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Normalises `page` and `limit` coming from the query string.
 *
 * Without a cap, `?limit=999999` would make the server load an entire table
 * into memory, so the value is clamped rather than trusted.
 */
const parsePagination = (query = {}) => {
  const rawPage = parseInt(query.page, 10);
  const rawLimit = parseInt(query.limit, 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, MAX_LIMIT)
    : DEFAULT_LIMIT;

  return { page, limit, offset: (page - 1) * limit };
};

const validatePagination = (query = {}) => {
  const errors = [];
  const rawPage = parseInt(query.page, 10);
  const rawLimit = parseInt(query.limit, 10);

  if (query.page !== undefined && (!Number.isFinite(rawPage) || rawPage < 1)) {
    errors.push('Page debe ser un número mayor o igual a 1');
  }
  if (query.limit !== undefined && (!Number.isFinite(rawLimit) || rawLimit < 1)) {
    errors.push('Limit debe ser un número mayor o igual a 1');
  }
  if (query.limit !== undefined && Number.isFinite(rawLimit) && rawLimit > MAX_LIMIT) {
    errors.push(`Limit no puede superar ${MAX_LIMIT}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    errorCode: errors.length > 0 ? ERROR_CODES.VALIDATION_ERROR : null
  };
};

module.exports = {
  parsePagination,
  validatePagination,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT
};
