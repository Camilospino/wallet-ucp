const walletService = require('../services/walletService');
const { validateTransfer } = require('../validators/walletValidator');

const transfer = async (req, res) => {
  try {
    const validation = validateTransfer(req.body);
    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        message: validation.errors.join(', '),
        error: validation.errorCode
      });
    }

    const { recipientEmail, amount } = req.body;
    const result = await walletService.transfer(req.user.userId, recipientEmail, amount);

    res.status(200).json({
      success: true,
      message: 'Transferencia realizada correctamente',
      data: { transaction: result.transaction }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al realizar transferencia',
      error: error.code || 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  transfer
};
