const transactionRepository = require('../repositories/transactionRepository');
const movementRepository = require('../repositories/movementRepository');
const walletRepository = require('../repositories/walletRepository');
const { ERROR_CODES } = require('../config/constants');

const getTransactionHistory = async (walletId, page = 1, limit = 20, filters = {}) => {
  const safePage = Math.max(1, parseInt(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (safePage - 1) * safeLimit;

  // The walletId filter is applied in BOTH queries so `total` describes exactly
  // the rows returned. Passing it only to count() used to report the global
  // number of transactions in the system, breaking pagination.
  const scopedFilters = { ...filters, walletId };

  const [transactions, total] = await Promise.all([
    transactionRepository.findByWalletId(walletId, safeLimit, offset, filters),
    transactionRepository.count(scopedFilters)
  ]);

  return {
    transactions,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit))
    }
  };
};

const getTransactionById = async (transactionId, userId) => {
  const transaction = await transactionRepository.findById(transactionId);
  if (!transaction) {
    throw {
      statusCode: 404,
      code: ERROR_CODES.TRANSACTION_NOT_FOUND,
      message: 'Transacción no encontrada'
    };
  }

  const wallet = await walletRepository.findByUserId(userId);
  if (!wallet) {
    throw {
      statusCode: 404,
      code: ERROR_CODES.WALLET_NOT_FOUND,
      message: 'Billetera no encontrada'
    };
  }

  // Route params are strings while ids come back as numbers, so compare loosely.
  if (Number(transaction.origen_wallet_id) !== wallet.id &&
      Number(transaction.destino_wallet_id) !== wallet.id) {
    throw {
      statusCode: 403,
      code: ERROR_CODES.AUTHORIZATION_ERROR,
      message: 'No tienes permiso para ver esta transacción'
    };
  }

  const movements = await movementRepository.findByTransactionId(transaction.id);
  
  return {
    transaction,
    movements
  };
};

module.exports = {
  getTransactionHistory,
  getTransactionById
};
