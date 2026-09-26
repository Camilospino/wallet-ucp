const walletService = require('../services/walletService');
const { validateDeposit, validateWithdraw } = require('../validators/walletValidator');

const deposit = async (req, res) => {
  try {
    const validation = validateDeposit(req.body);
    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        message: validation.errors.join(', '),
        error: validation.errorCode
      });
    }

    const { amount } = req.body;
    const result = await walletService.deposit(req.user.userId, amount);

    res.status(200).json({
      success: true,
      message: 'Depósito realizado correctamente',
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al realizar depósito',
      error: error.code || 'INTERNAL_ERROR'
    });
  }
};

const withdraw = async (req, res) => {
  try {
    const validation = validateWithdraw(req.body);
    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        message: validation.errors.join(', '),
        error: validation.errorCode
      });
    }

    const { amount } = req.body;
    const result = await walletService.withdraw(req.user.userId, amount);

    res.status(200).json({
      success: true,
      message: 'Retiro realizado correctamente',
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al realizar retiro',
      error: error.code || 'INTERNAL_ERROR'
    });
  }
};

const getWallet = async (req, res) => {
  try {
    const result = await walletService.getWalletInfo(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Billetera obtenida correctamente',
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al obtener billetera',
      error: error.code || 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  deposit,
  withdraw,
  getWallet
};
