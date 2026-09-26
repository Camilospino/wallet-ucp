const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

/**
 * Tags every request with an id and logs how long it took.
 *
 * The id is echoed back in the `X-Request-Id` header so a user can quote it,
 * and it is attached to the request so error logs can be traced back to the
 * exact call that produced them.
 */
const requestLogger = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    const context = {
      requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100
    };

    if (req.user?.userId) context.userId = req.user.userId;

    if (res.statusCode >= 500) {
      logger.error('Petición fallida', context);
    } else if (res.statusCode >= 400) {
      // Client errors are expected during normal use, so they stay at warn.
      logger.warn('Petición rechazada', context);
    } else {
      logger.info('Petición completada', context);
    }
  });

  next();
};

module.exports = { requestLogger };
