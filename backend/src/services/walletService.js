const pool = require('../config/database');
const walletRepository = require('../repositories/walletRepository');
const transactionRepository = require('../repositories/transactionRepository');
const movementRepository = require('../repositories/movementRepository');
const userRepository = require('../repositories/userRepository');
const { generateTransactionReference } = require('../utils/generateReference');
const logger = require('../utils/logger');
const { WALLET_STATES, TRANSACTION_TYPES, TRANSACTION_STATES, MOVEMENT_TYPES, ERROR_CODES } = require('../config/constants');

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
      console.error('Rollback failed:', rollbackError.message);
    }
    throw error;
  } finally {
    client.release();
  }
};

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

const deposit = async (usuarioId, amount) => {
  return withTransaction(async (client) => {
    const wallet = await walletRepository.lockByUserIdForUpdate(usuarioId, client);
    assertWalletIsUsable(wallet);

    const saldoAnterior = parseFloat(wallet.saldo);
    const saldoResultante = saldoAnterior + parseFloat(amount);

    await walletRepository.updateBalance(wallet.id, saldoResultante, client);

    const referencia = generateTransactionReference();
    const transaction = await transactionRepository.create(
      referencia,
      null,
      wallet.id,
      TRANSACTION_TYPES.DEPOSIT,
      amount,
      TRANSACTION_STATES.COMPLETED,
      'Depósito a billetera',
      client
    );

    await movementRepository.create(
      wallet.id,
      transaction.id,
      MOVEMENT_TYPES.CREDIT,
      amount,
      saldoAnterior,
      saldoResultante,
      client
    );

    logger.info('Depósito completado', {
      usuarioId, walletId: wallet.id, monto: amount,
      saldoAnterior, saldoResultante, referencia
    });

    return {
      transaction,
      wallet: { ...wallet, saldo: saldoResultante }
    };
  });
};

const withdraw = async (usuarioId, amount) => {
  return withTransaction(async (client) => {
    const wallet = await walletRepository.lockByUserIdForUpdate(usuarioId, client);
    assertWalletIsUsable(wallet);

    const saldoAnterior = parseFloat(wallet.saldo);
    const amountValue = parseFloat(amount);

    if (saldoAnterior < amountValue) {
      throw {
        statusCode: 400,
        code: ERROR_CODES.INSUFFICIENT_BALANCE,
        message: 'Saldo insuficiente'
      };
    }

    const saldoResultante = saldoAnterior - amountValue;

    await walletRepository.updateBalance(wallet.id, saldoResultante, client);

    const referencia = generateTransactionReference();
    const transaction = await transactionRepository.create(
      referencia,
      wallet.id,
      null,
      TRANSACTION_TYPES.WITHDRAW,
      amount,
      TRANSACTION_STATES.COMPLETED,
      'Retiro de billetera',
      client
    );

    await movementRepository.create(
      wallet.id,
      transaction.id,
      MOVEMENT_TYPES.DEBIT,
      amount,
      saldoAnterior,
      saldoResultante,
      client
    );

    logger.info('Retiro completado', {
      usuarioId, walletId: wallet.id, monto: amount,
      saldoAnterior, saldoResultante, referencia
    });

    return {
      transaction,
      wallet: { ...wallet, saldo: saldoResultante }
    };
  });
};

const transfer = async (origenUsuarioId, recipientEmail, amount) => {
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

    if (Number(destinoUser.id) === origenId) {
      throw {
        statusCode: 400,
        code: ERROR_CODES.TRANSFER_TO_SELF,
        message: 'No puedes transferir a ti mismo'
      };
    }

    if (destinoUser.estado !== 'ACTIVE') {
      throw {
        statusCode: 403,
        code: ERROR_CODES.TRANSFER_TO_BLOCKED,
        message: 'Usuario destinatario bloqueado'
      };
    }

    // Lock both wallets in a fixed order to avoid deadlocks, then verify.
    const [origenWallet, destinoWallet] = await lockWalletsInOrder(
      origenId,
      Number(destinoUser.id),
      client
    );

    assertWalletIsUsable(origenWallet);
    assertWalletIsUsable(destinoWallet);

    const amountValue = parseFloat(amount);
    const saldoAnteriorOrigen = parseFloat(origenWallet.saldo);

    if (saldoAnteriorOrigen < amountValue) {
      throw {
        statusCode: 400,
        code: ERROR_CODES.INSUFFICIENT_BALANCE,
        message: 'Saldo insuficiente'
      };
    }

    const saldoResultanteOrigen = saldoAnteriorOrigen - amountValue;
    await walletRepository.updateBalance(origenWallet.id, saldoResultanteOrigen, client);

    const saldoAnteriorDestino = parseFloat(destinoWallet.saldo);
    const saldoResultanteDestino = saldoAnteriorDestino + amountValue;
    await walletRepository.updateBalance(destinoWallet.id, saldoResultanteDestino, client);

    const referencia = generateTransactionReference();
    const transaction = await transactionRepository.create(
      referencia,
      origenWallet.id,
      destinoWallet.id,
      TRANSACTION_TYPES.TRANSFER,
      amount,
      TRANSACTION_STATES.COMPLETED,
      `Transferencia a ${recipientEmail}`,
      client
    );

    await movementRepository.create(
      origenWallet.id,
      transaction.id,
      MOVEMENT_TYPES.DEBIT,
      amount,
      saldoAnteriorOrigen,
      saldoResultanteOrigen,
      client
    );

    await movementRepository.create(
      destinoWallet.id,
      transaction.id,
      MOVEMENT_TYPES.CREDIT,
      amount,
      saldoAnteriorDestino,
      saldoResultanteDestino,
      client
    );

    logger.info('Transferencia completada', {
      origenUsuarioId: origenId, destinoUsuarioId: destinoUser.id,
      monto: amount, referencia,
      saldoOrigen: saldoResultanteOrigen, saldoDestino: saldoResultanteDestino
    });

    return {
      transaction,
      origenWallet: { ...origenWallet, saldo: saldoResultanteOrigen },
      destinoWallet: { ...destinoWallet, saldo: saldoResultanteDestino }
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
  
  const movements = await movementRepository.findByWalletId(wallet.id, 5, 0);
  
  return {
    wallet,
    recentMovements: movements
  };
};

module.exports = {
  deposit,
  withdraw,
  transfer,
  getWalletInfo
};
