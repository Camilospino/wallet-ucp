const { ERROR_CODES } = require('../config/constants');
const { validateOptionalCardId, validateOptionalCardType } = require('./cardValidator');

const MAX_AMOUNT = 999999999999.99;

/**
 * Validates a monetary amount.
 *
 * Note: `amount: 0` is a *present but non-positive* value, so it must NOT be
 * reported as "required". Only null/undefined/'' are treated as missing.
 */
const validateAmount = (amount) => {
  const errors = [];

  if (amount === undefined || amount === null || amount === '') {
    errors.push('Monto es requerido y debe ser numérico');
    return errors;
  }

  const value = typeof amount === 'number' ? amount : Number(amount);

  if (!Number.isFinite(value)) {
    errors.push('Monto es requerido y debe ser numérico');
  } else if (value <= 0) {
    errors.push('Monto debe ser mayor a 0');
  } else if (value > MAX_AMOUNT) {
    errors.push('Monto excede el máximo permitido');
  }

  return errors;
};

const buildResult = (errors) => ({
  isValid: errors.length === 0,
  errors,
  errorCode: errors.length > 0 ? ERROR_CODES.VALIDATION_ERROR : null
});

// `cardId` is optional in every operation (the debit card is used when it is
// missing); when present it must be an id.
const validateDeposit = (data) =>
  buildResult([...validateAmount(data.amount), ...validateOptionalCardId(data.cardId)]);

const validateWithdraw = (data) =>
  buildResult([...validateAmount(data.amount), ...validateOptionalCardId(data.cardId)]);

const validateTransfer = (data) => {
  const errors = [];

  if (!data.recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.recipientEmail)) {
    errors.push('Email del destinatario inválido');
  }

  errors.push(...validateAmount(data.amount));
  errors.push(...validateOptionalCardId(data.cardId));
  errors.push(...validateOptionalCardType(data.recipientCardType));

  return buildResult(errors);
};

module.exports = {
  validateDeposit,
  validateWithdraw,
  validateTransfer
};
