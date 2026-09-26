const authService = require('../services/authService');
const { ERROR_CODES } = require('../config/constants');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado',
        error: ERROR_CODES.AUTHENTICATION_ERROR
      });
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Error de autenticación',
      error: error.code || ERROR_CODES.AUTHENTICATION_ERROR
    });
  }
};

const roleMiddleware = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
        error: ERROR_CODES.AUTHENTICATION_ERROR
      });
    }

    if (req.user.rol !== requiredRole) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado',
        error: ERROR_CODES.AUTHORIZATION_ERROR
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  roleMiddleware
};
