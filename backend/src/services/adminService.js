const userRepository = require('../repositories/userRepository');
const walletRepository = require('../repositories/walletRepository');
const transactionRepository = require('../repositories/transactionRepository');
const { USER_STATES, WALLET_STATES, ERROR_CODES } = require('../config/constants');

const getAllUsers = async (page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  
  const users = await userRepository.getAll(limit, offset);
  const total = await userRepository.count();
  
  const usersWithWallets = await Promise.all(
    users.map(async (user) => {
      const wallet = await walletRepository.findByUserId(user.id);
      return {
        ...user,
        wallet: wallet ? {
          id: wallet.id,
          saldo: wallet.saldo,
          estado: wallet.estado
        } : null
      };
    })
  );
  
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

  const updatedUser = await userRepository.updateState(userId, USER_STATES.BLOCKED);
  
  const wallet = await walletRepository.findByUserId(userId);
  if (wallet) {
    await walletRepository.updateState(wallet.id, WALLET_STATES.BLOCKED);
  }
  
  return updatedUser;
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

  const updatedUser = await userRepository.updateState(userId, USER_STATES.ACTIVE);
  
  const wallet = await walletRepository.findByUserId(userId);
  if (wallet && wallet.estado === WALLET_STATES.BLOCKED) {
    await walletRepository.updateState(wallet.id, WALLET_STATES.ACTIVE);
  }
  
  return updatedUser;
};

module.exports = {
  getAllUsers,
  getAllWallets,
  getAllTransactions,
  blockUser,
  unblockUser
};
