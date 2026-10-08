const userRepository = require('../repositories/userRepository');
const walletRepository = require('../repositories/walletRepository');
const transactionRepository = require('../repositories/transactionRepository');
const { withTransaction } = require('../utils/withTransaction');
const { USER_STATES, WALLET_STATES, ERROR_CODES } = require('../config/constants');

const getAllUsers = async (page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  
  const users = await userRepository.getAll(limit, offset);
  const total = await userRepository.count();
  
  const wallets = await walletRepository.findByUserIds(users.map((user) => user.id));
  const walletByUserId = new Map(wallets.map((wallet) => [wallet.usuario_id, wallet]));

  const usersWithWallets = users.map((user) => {
    const wallet = walletByUserId.get(user.id);
    return {
      ...user,
      wallet: wallet ? {
        id: wallet.id,
        saldo: wallet.saldo,
        estado: wallet.estado
      } : null
    };
  });
  
  return {
    users: usersWithWallets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const getAllWallets = async (page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  
  const wallets = await walletRepository.getAll(limit, offset);
  const total = await walletRepository.count();
  
  return {
    wallets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const getAllTransactions = async (page = 1, limit = 50, filters = {}) => {
  const offset = (page - 1) * limit;
  
  const transactions = await transactionRepository.getAll(limit, offset, filters);
  const total = await transactionRepository.count(filters);
  
  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const blockUser = async (userId, requestingUserId = null) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw {
      statusCode: 404,
      code: ERROR_CODES.USER_NOT_FOUND,
      message: 'Usuario no encontrado'
    };
  }

  // req.params.id is a string while the JWT userId is a number.
  if (Number(userId) === Number(requestingUserId)) {
    throw {
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'No puedes bloquear tu propia cuenta'
    };
  }

  if (user.estado === USER_STATES.BLOCKED) {
    throw {
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Usuario ya está bloqueado'
    };
  }

  // User and wallet change state together: a blocked user with an active
  // wallet (or the reverse) must never be observable.
  return withTransaction(async (client) => {
    const updatedUser = await userRepository.updateState(userId, USER_STATES.BLOCKED, client);

    const wallet = await walletRepository.findByUserId(userId, client);
    if (wallet) {
      await walletRepository.updateState(wallet.id, WALLET_STATES.BLOCKED, client);
    }

    return updatedUser;
  });
};

const unblockUser = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw {
      statusCode: 404,
      code: ERROR_CODES.USER_NOT_FOUND,
      message: 'Usuario no encontrado'
    };
  }

  if (user.estado === USER_STATES.ACTIVE) {
    throw {
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Usuario ya está activo'
    };
  }

  return withTransaction(async (client) => {
    const updatedUser = await userRepository.updateState(userId, USER_STATES.ACTIVE, client);

    const wallet = await walletRepository.findByUserId(userId, client);
    if (wallet && wallet.estado === WALLET_STATES.BLOCKED) {
      await walletRepository.updateState(wallet.id, WALLET_STATES.ACTIVE, client);
    }

    return updatedUser;
  });
};

module.exports = {
  getAllUsers,
  getAllWallets,
  getAllTransactions,
  blockUser,
  unblockUser
};
