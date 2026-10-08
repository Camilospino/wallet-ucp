const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const { ERROR_CODES, USER_STATES } = require('../config/constants');

/**
 * Verifies the JWT and then re-reads the user from the database.
 *
 * The token alone is not enough: it stays valid for JWT_EXPIRES_IN (24h), so
 * a user blocked by an admin, or an admin whose role was removed, would keep
 * their access until it expired. Reading the user on every request makes a
 * block or a role change effective immediately.
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token no proporcionado',
      error: ERROR_CODES.AUTHENTICATION_ERROR
    });
  }

  let decoded;
  try {
    decoded = authService.verifyToken(authHeader.substring(7));
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Error de autenticación',
      error: error.code || ERROR_CODES.AUTHENTICATION_ERROR
    });
  }

  try {
    const user = await userRepository.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
        error: ERROR_CODES.AUTHENTICATION_ERROR
      });
    }

    if (user.estado !== USER_STATES.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: 'Usuario bloqueado',
        error: ERROR_CODES.USER_BLOCKED
      });
    }

    // The role comes from the database, not from the (possibly stale) token.
    req.user = { ...decoded, email: user.email, rol: user.rol };
    next();
  } catch (error) {
    // A database failure is a server error, not an authentication failure.
    next(error);
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
