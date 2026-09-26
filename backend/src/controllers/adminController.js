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

const getAllUsers = async (req, res) => {
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
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al obtener usuarios',
      error: error.code || 'INTERNAL_ERROR'
    });
  }
};

const getAllWallets = async (req, res) => {
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
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al obtener billeteras',
      error: error.code || 'INTERNAL_ERROR'
    });
  }
};

const getAllTransactions = async (req, res) => {
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
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al obtener transacciones',
      error: error.code || 'INTERNAL_ERROR'
    });
  }
};

const blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.blockUser(id, req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Usuario bloqueado correctamente',
      data: { user: result }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al bloquear usuario',
      error: error.code || 'INTERNAL_ERROR'
    });
  }
};

const unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.unblockUser(id);

    res.status(200).json({
      success: true,
      message: 'Usuario desbloqueado correctamente',
      data: { user: result }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al desbloquear usuario',
      error: error.code || 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  getAllUsers,
  getAllWallets,
  getAllTransactions,
  blockUser,
  unblockUser
};
