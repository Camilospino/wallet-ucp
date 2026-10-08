const walletService = require('../services/walletService');
const { validateTransfer } = require('../validators/walletValidator');

const transfer = async (req, res, next) => {
  try {
    const validation = validateTransfer(req.body);
    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        message: validation.errors.join(', '),
        error: validation.errorCode
      });
    }

    const { recipientEmail, amount, cardId, recipientCardType } = req.body;
    const result = await walletService.transfer(
      req.user.userId, recipientEmail, amount, cardId, recipientCardType
    );

    res.status(200).json({
      success: true,
      message: 'Transferencia realizada correctamente',
      data: { transaction: result.transaction, card: result.card }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  transfer
};
