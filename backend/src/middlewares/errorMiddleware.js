const { ERROR_CODES } = require('../config/constants');
const logger = require('../utils/logger');

// Express identifies a malformed JSON body this way; it is a client mistake,
// not a server fault, so it must not be reported as a 500.
const isBadJson = (err) => err.type === 'entity.parse.failed';

const errorHandler = (err, req, res, _next) => {
  const requestId = req.requestId;

  if (isBadJson(err)) {
    logger.warn('Cuerpo JSON inválido', { requestId, error: err.message });
    return res.status(400).json({
      success: false,
      message: 'El cuerpo de la petición no es JSON válido',
      error: ERROR_CODES.VALIDATION_ERROR
    });
  }

  // Errors thrown deliberately by the service layer carry their own status.
  const isExpected = Boolean(err.statusCode);

  const context = {
    requestId,
    status: err.statusCode || 500,
    error: err.message
  };
  if (!isExpected) context.stack = err.stack;

  if (isExpected) {
    logger.warn('Error de negocio', context);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message || 'Error en la solicitud',
      error: err.code || ERROR_CODES.INTERNAL_ERROR
    });
  }

  logger.error('Error no controlado', context);

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: ERROR_CODES.INTERNAL_ERROR
  });
};

const notFoundHandler = (req, res) => {
  // A 404 is a client error, not an internal failure, so it must not be
  // reported as INTERNAL_ERROR.
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    error: ERROR_CODES.NOT_FOUND
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
