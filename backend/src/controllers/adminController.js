const adminService = require('../services/adminService');
const { parsePagination, validatePagination } = require('../validators/paginationValidator');

/**
 * Reads and validates the pagination query params. Responds 422 and returns
 * null when they are out of range, so the handler can bail out early.
 */
const readPagination = (req, res) => {
  const validation = validatePagination(req.query);
  if (!validation.isValid) {
    res.status(422).json({
      success: false,
      message: validation.errors.join(', '),
      error: validation.errorCode
    });
    return null;
  }
  return parsePagination(req.query);
};

const getAllUsers = async (req, res, next) => {
  try {
    const pagination = readPagination(req, res);
    if (!pagination) return;
    const { page, limit } = pagination;
    
    const result = await adminService.getAllUsers(page, limit);

    res.status(200).json({
      success: true,
      message: 'Usuarios obtenidos correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getAllWallets = async (req, res, next) => {
  try {
    const pagination = readPagination(req, res);
    if (!pagination) return;
    const { page, limit } = pagination;
    
    const result = await adminService.getAllWallets(page, limit);

    res.status(200).json({
      success: true,
      message: 'Billeteras obtenidas correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getAllTransactions = async (req, res, next) => {
  try {
    const pagination = readPagination(req, res);
    if (!pagination) return;
    const { page, limit } = pagination;
    const filters = {
      tipo: req.query.tipo,
      estado: req.query.estado,
      fechaInicio: req.query.fechaInicio,
      fechaFin: req.query.fechaFin
    };
    
    const result = await adminService.getAllTransactions(page, limit, filters);

    res.status(200).json({
      success: true,
      message: 'Transacciones obtenidas correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const blockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.blockUser(id, req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Usuario bloqueado correctamente',
      data: { user: result }
    });
  } catch (error) {
    next(error);
  }
};

const unblockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.unblockUser(id);

    res.status(200).json({
      success: true,
      message: 'Usuario desbloqueado correctamente',
      data: { user: result }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getAllWallets,
  getAllTransactions,
  blockUser,
  unblockUser
};
