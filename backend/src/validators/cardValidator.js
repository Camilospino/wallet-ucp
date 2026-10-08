const { CARD_TYPES } = require('../config/constants');

const MAX_INT4 = 2147483647;

/**
 * Validates the optional `cardId` of a deposit, withdrawal or transfer.
 * Absent (undefined/null) is valid: the API then uses the debit card.
 */
const validateOptionalCardId = (cardId) => {
  if (cardId === undefined || cardId === null) return [];

  const isPositiveInt = Number.isInteger(cardId) && cardId >= 1 && cardId <= MAX_INT4;
  return isPositiveInt ? [] : ['La tarjeta seleccionada no es válida'];
};

/**
 * Validates the optional card type the recipient of a transfer receives on.
 * Absent means DEBIT.
 */
const validateOptionalCardType = (tipo) => {
  if (tipo === undefined || tipo === null) return [];
  return Object.values(CARD_TYPES).includes(tipo)
    ? []
    : ['La tarjeta del destinatario debe ser CREDIT o DEBIT'];
};

module.exports = {
  validateOptionalCardId,
  validateOptionalCardType
};
