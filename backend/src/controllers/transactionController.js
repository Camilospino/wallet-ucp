const transactionService = require('../services/transactionService');
const walletService = require('../services/walletService');
const { parsePagination, validatePagination } = require('../validators/paginationValidator');

const getTransactionHistory = async (req, res) => {
  try {
    // getWalletInfo returns the wallet plus recent movements; here we only need
    // the wallet id, so read it directly to avoid an unnecessary extra query.
    const walletInfo = await walletService.getWalletInfo(req.user.userId);
    
    const validation = validatePagination(req.query);
    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        message: validation.errors.join(', '),
        error: validation.errorCode
      });
    }
    const { page, limit } = parsePagination(req.query);

    const filters = {
      tipo: req.query.tipo,
      estado: req.query.estado,
      fechaInicio: req.query.fechaInicio,
      fechaFin: req.query.fechaFin
    };

    const result = await transactionService.getTransactionHistory(
      walletInfo.wallet.id,
      page,
      limit,
      filters
    );

    res.status(200).json({
      success: true,
      message: 'Historial de transacciones obtenido correctamente',
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al obtener historial de transacciones',
      error: error.code || 'INTERNAL_ERROR'
    });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await transactionService.getTransactionById(id, req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Transacción obtenida correctamente',
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al obtener transacción',
      error: error.code || 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  getTransactionHistory,
  getTransactionById
};
