const walletRepository = require('../repositories/walletRepository');
const transactionRepository = require('../repositories/transactionRepository');
const movementRepository = require('../repositories/movementRepository');
const userRepository = require('../repositories/userRepository');
const cardRepository = require('../repositories/cardRepository');
const cardService = require('./cardService');
const { generateTransactionReference } = require('../utils/generateReference');
const logger = require('../utils/logger');
const { withTransaction } = require('../utils/withTransaction');
const { roundMoney } = require('../utils/money');
const { USER_STATES, WALLET_STATES, CARD_TYPES, TRANSACTION_TYPES, TRANSACTION_STATES, MOVEMENT_TYPES, ERROR_CODES } = require('../config/constants');

const assertWalletIsUsable = (wallet) => {
  if (!wallet) {
    throw {
      statusCode: 404,
      code: ERROR_CODES.WALLET_NOT_FOUND,
      message: 'Billetera no encontrada'
    };
  }

  if (wallet.estado !== WALLET_STATES.ACTIVE) {
    throw {
      statusCode: 403,
      code: ERROR_CODES.WALLET_BLOCKED,
      message: 'Billetera bloqueada o cerrada'
    };
  }
};

/**
 * Locks two wallets in a deterministic order (ascending user id) so that two
 * concurrent transfers in opposite directions can never deadlock each other.
 * Returns [walletOf(usuarioIdA), walletOf(usuarioIdB)].
 */
const lockWalletsInOrder = async (usuarioIdA, usuarioIdB, client) => {
  const orderedIds = [usuarioIdA, usuarioIdB].sort((a, b) => a - b);

  const firstWallet = await walletRepository.lockByUserIdForUpdate(orderedIds[0], client);
  const secondWallet = await walletRepository.lockByUserIdForUpdate(orderedIds[1], client);

  return orderedIds[0] === usuarioIdA
    ? [firstWallet, secondWallet]
    : [secondWallet, firstWallet];
};

const insufficientBalance = (card) => ({
  statusCode: 400,
  code: ERROR_CODES.INSUFFICIENT_BALANCE,
  message: `Saldo insuficiente en la tarjeta de ${card.tipo === CARD_TYPES.CREDIT ? 'crédito' : 'débito'}`
});

/**
 * Money model: every user has a credit and a debit card, each with its own
 * balance, and the wallet balance is ALWAYS the sum of both. So every
 * operation changes a card and its wallet by the same amount, in the same SQL
 * transaction, while holding the wallet lock (taken first) and the card lock.
 * Because every card change happens under its owner's wallet lock, the
 * deterministic wallet lock order is what prevents deadlocks.
 */

const deposit = async (usuarioId, amount, cardId = null) => {
  return withTransaction(async (client) => {
    const wallet = await walletRepository.lockByUserIdForUpdate(usuarioId, client);
    assertWalletIsUsable(wallet);

    // The card the money is deposited INTO (the debit card when omitted).
    const card = await cardService.lockCardForOperation(cardId, usuarioId, client);

    const amountValue = parseFloat(amount);
    const saldoAnterior = parseFloat(wallet.saldo);
    const saldoResultante = roundMoney(saldoAnterior + amountValue);
    const saldoTarjeta = roundMoney(parseFloat(card.saldo) + amountValue);

    await walletRepository.updateBalance(wallet.id, saldoResultante, client);
    await cardRepository.updateBalance(card.id, saldoTarjeta, client);

    const referencia = generateTransactionReference();
    const transaction = await transactionRepository.create(
      referencia,
      null,
      wallet.id,
      TRANSACTION_TYPES.DEPOSIT,
      amount,
      TRANSACTION_STATES.COMPLETED,
      'Depósito a billetera',
      null,
      card.id,
      client
    );

    await movementRepository.create(
      wallet.id,
      transaction.id,
      MOVEMENT_TYPES.CREDIT,
      amount,
      saldoAnterior,
      saldoResultante,
      card.id,
      client
    );

    logger.info('Depósito completado', {
      usuarioId, walletId: wallet.id, monto: amount,
      saldoAnterior, saldoResultante, referencia,
      tarjetaId: card.id, saldoTarjeta
    });

    return {
      transaction,
      wallet: { ...wallet, saldo: saldoResultante },
      card: { ...card, saldo: saldoTarjeta }
    };
  });
};

const withdraw = async (usuarioId, amount, cardId = null) => {
  return withTransaction(async (client) => {
    const wallet = await walletRepository.lockByUserIdForUpdate(usuarioId, client);
    assertWalletIsUsable(wallet);

    // The card the money is withdrawn FROM (the debit card when omitted).
    const card = await cardService.lockCardForOperation(cardId, usuarioId, client);

    const amountValue = parseFloat(amount);
    const saldoTarjetaAnterior = parseFloat(card.saldo);

    // The CARD must cover the amount: money on the other card does not count.
    if (saldoTarjetaAnterior < amountValue) {
      throw insufficientBalance(card);
    }

    const saldoAnterior = parseFloat(wallet.saldo);
    const saldoResultante = roundMoney(saldoAnterior - amountValue);
    const saldoTarjeta = roundMoney(saldoTarjetaAnterior - amountValue);

    await walletRepository.updateBalance(wallet.id, saldoResultante, client);
    await cardRepository.updateBalance(card.id, saldoTarjeta, client);

    const referencia = generateTransactionReference();
    const transaction = await transactionRepository.create(
      referencia,
      wallet.id,
      null,
      TRANSACTION_TYPES.WITHDRAW,
      amount,
      TRANSACTION_STATES.COMPLETED,
      'Retiro de billetera',
      card.id,
      null,
      client
    );

    await movementRepository.create(
      wallet.id,
      transaction.id,
      MOVEMENT_TYPES.DEBIT,
      amount,
      saldoAnterior,
      saldoResultante,
      card.id,
      client
    );

    logger.info('Retiro completado', {
      usuarioId, walletId: wallet.id, monto: amount,
      saldoAnterior, saldoResultante, referencia,
      tarjetaId: card.id, saldoTarjeta
    });

    return {
      transaction,
      wallet: { ...wallet, saldo: saldoResultante },
      card: { ...card, saldo: saldoTarjeta }
    };
  });
};

/**
 * @param cardId            sender's card the money leaves from (debit if omitted)
 * @param recipientCardType recipient's card it arrives on: CREDIT or DEBIT
 *                          (debit if omitted). Chosen by type because the
 *                          sender must not know the recipient's card ids.
 */
const transfer = async (origenUsuarioId, recipientEmail, amount, cardId = null, recipientCardType = null) => {
  // The JWT userId is a number but route params are strings; normalise so the
  // self-transfer and lock-order comparisons are always reliable.
  const origenId = Number(origenUsuarioId);

  return withTransaction(async (client) => {
    const destinoUser = await userRepository.findByEmail(recipientEmail, client);
    if (!destinoUser) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.USER_NOT_FOUND,
        message: 'Usuario destinatario no encontrado'
      };
    }

    const destinoId = Number(destinoUser.id);

    if (destinoId === origenId) {
      throw {
        statusCode: 400,
        code: ERROR_CODES.TRANSFER_TO_SELF,
        message: 'No puedes transferir a ti mismo'
      };
    }

    if (destinoUser.estado !== USER_STATES.ACTIVE) {
      throw {
        statusCode: 403,
        code: ERROR_CODES.TRANSFER_TO_BLOCKED,
        message: 'Usuario destinatario bloqueado'
      };
    }

    // Lock both wallets in a fixed order to avoid deadlocks, then verify.
    const [origenWallet, destinoWallet] = await lockWalletsInOrder(origenId, destinoId, client);

    assertWalletIsUsable(origenWallet);
    assertWalletIsUsable(destinoWallet);

    // Cards are locked in the same user-id order as the wallets.
    const lockOrigenCard = () => cardService.lockCardForOperation(cardId, origenId, client);
    const lockDestinoCard = () => cardService.lockRecipientCard(destinoId, recipientCardType, client);
    let origenCard;
    let destinoCard;
    if (origenId < destinoId) {
      origenCard = await lockOrigenCard();
      destinoCard = await lockDestinoCard();
    } else {
      destinoCard = await lockDestinoCard();
      origenCard = await lockOrigenCard();
    }

    const amountValue = parseFloat(amount);
    const saldoTarjetaOrigenAnterior = parseFloat(origenCard.saldo);

    if (saldoTarjetaOrigenAnterior < amountValue) {
      throw insufficientBalance(origenCard);
    }

    const saldoAnteriorOrigen = parseFloat(origenWallet.saldo);
    const saldoResultanteOrigen = roundMoney(saldoAnteriorOrigen - amountValue);
    const saldoTarjetaOrigen = roundMoney(saldoTarjetaOrigenAnterior - amountValue);
    await walletRepository.updateBalance(origenWallet.id, saldoResultanteOrigen, client);
    await cardRepository.updateBalance(origenCard.id, saldoTarjetaOrigen, client);

    const saldoAnteriorDestino = parseFloat(destinoWallet.saldo);
    const saldoResultanteDestino = roundMoney(saldoAnteriorDestino + amountValue);
    const saldoTarjetaDestino = roundMoney(parseFloat(destinoCard.saldo) + amountValue);
    await walletRepository.updateBalance(destinoWallet.id, saldoResultanteDestino, client);
    await cardRepository.updateBalance(destinoCard.id, saldoTarjetaDestino, client);

    const referencia = generateTransactionReference();
    const transaction = await transactionRepository.create(
      referencia,
      origenWallet.id,
      destinoWallet.id,
      TRANSACTION_TYPES.TRANSFER,
      amount,
      TRANSACTION_STATES.COMPLETED,
      `Transferencia a ${recipientEmail}`,
      origenCard.id,
      destinoCard.id,
      client
    );

    await movementRepository.create(
      origenWallet.id,
      transaction.id,
      MOVEMENT_TYPES.DEBIT,
      amount,
      saldoAnteriorOrigen,
      saldoResultanteOrigen,
      origenCard.id,
      client
    );

    await movementRepository.create(
      destinoWallet.id,
      transaction.id,
      MOVEMENT_TYPES.CREDIT,
      amount,
      saldoAnteriorDestino,
      saldoResultanteDestino,
      destinoCard.id,
      client
    );

    logger.info('Transferencia completada', {
      origenUsuarioId: origenId, destinoUsuarioId: destinoId,
      monto: amount, referencia,
      tarjetaOrigenId: origenCard.id, tarjetaDestinoId: destinoCard.id,
      saldoOrigen: saldoResultanteOrigen, saldoDestino: saldoResultanteDestino
    });

    // The recipient's card is deliberately NOT returned to the sender.
    const { tarjeta_destino_id, ...visibleTransaction } = transaction;

    return {
      transaction: visibleTransaction,
      origenWallet: { ...origenWallet, saldo: saldoResultanteOrigen },
      destinoWallet: { ...destinoWallet, saldo: saldoResultanteDestino },
      card: { ...origenCard, saldo: saldoTarjetaOrigen }
    };
  });
};

const getWalletInfo = async (usuarioId) => {
  const wallet = await walletRepository.findByUserId(usuarioId);
  if (!wallet) {
    throw {
      statusCode: 404,
      code: ERROR_CODES.WALLET_NOT_FOUND,
      message: 'Billetera no encontrada'
    };
  }
  
  const [movements, cards] = await Promise.all([
    movementRepository.findByWalletId(wallet.id, 5, 0),
    cardService.listCards(usuarioId)
  ]);

  return {
    wallet,
    cards,
    recentMovements: movements
  };
};

module.exports = {
  deposit,
  withdraw,
  transfer,
  getWalletInfo
};
