const { randomInt } = require('crypto');
const cardRepository = require('../repositories/cardRepository');
const { ERROR_CODES, CARD_TYPES, CARD_BRANDS } = require('../config/constants');

// Every user gets exactly these two cards.
const DEFAULT_CARDS = [
  { tipo: CARD_TYPES.CREDIT, marca: CARD_BRANDS.VISA },
  { tipo: CARD_TYPES.DEBIT, marca: CARD_BRANDS.MASTERCARD }
];

const cardNotFound = () => ({
  statusCode: 404,
  code: ERROR_CODES.CARD_NOT_FOUND,
  message: 'Tarjeta no encontrada'
});

const randomLastDigits = () => String(randomInt(10000)).padStart(4, '0');

/**
 * Creates the credit and debit card of a new user, both with balance 0.
 * Runs inside the registration transaction, so `client` is required.
 */
const createDefaultCards = async (usuarioId, client) => {
  const cards = [];
  for (const { tipo, marca } of DEFAULT_CARDS) {
    cards.push(await cardRepository.create(usuarioId, tipo, marca, randomLastDigits(), 0, client));
  }
  return cards;
};

const listCards = async (usuarioId) => cardRepository.findByUserId(usuarioId);

/**
 * Locks the card an operation will move money on.
 *
 * Without `cardId` the user's DEBIT card is used, so API clients that never
 * send a card keep working exactly as before. With `cardId` the card must
 * belong to the user; someone else's card answers exactly like a missing one
 * (404), so ids cannot be probed. Must run inside the operation's transaction
 * AFTER the wallet lock, so `client` is required.
 */
const lockCardForOperation = async (cardId, usuarioId, client) => {
  const card = cardId === undefined || cardId === null
    ? await cardRepository.lockByUserAndType(usuarioId, CARD_TYPES.DEBIT, client)
    : await cardRepository.lockByIdForUser(cardId, usuarioId, client);

  if (!card) throw cardNotFound();
  return card;
};

/** Locks the recipient's card of the chosen type (DEBIT when omitted). */
const lockRecipientCard = async (usuarioId, tipo, client) => {
  const card = await cardRepository.lockByUserAndType(usuarioId, tipo || CARD_TYPES.DEBIT, client);
  if (!card) throw cardNotFound();
  return card;
};

module.exports = {
  createDefaultCards,
  listCards,
  lockCardForOperation,
  lockRecipientCard
};
