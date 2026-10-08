const walletService = require('../services/walletService');
const { validateDeposit, validateWithdraw } = require('../validators/walletValidator');

const deposit = async (req, res, next) => {
  try {
    const validation = validateDeposit(req.body);
    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        message: validation.errors.join(', '),
        error: validation.errorCode
      });
    }

    const { amount, cardId } = req.body;
    const result = await walletService.deposit(req.user.userId, amount, cardId);

    res.status(200).json({
      success: true,
      message: 'Depósito realizado correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const withdraw = async (req, res, next) => {
  try {
    const validation = validateWithdraw(req.body);
    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        message: validation.errors.join(', '),
        error: validation.errorCode
      });
    }

    const { amount, cardId } = req.body;
    const result = await walletService.withdraw(req.user.userId, amount, cardId);

    res.status(200).json({
      success: true,
      message: 'Retiro realizado correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getWallet = async (req, res, next) => {
  try {
    const result = await walletService.getWalletInfo(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Billetera obtenida correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  deposit,
  withdraw,
  getWallet
};
