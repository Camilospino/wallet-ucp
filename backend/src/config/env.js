const logger = require('../utils/logger');

// Without these the server can start but every login (JWT_SECRET) or query
// (DATABASE_URL) fails at request time, so it is better not to start at all.
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'];

const DEFAULT_JWT_SECRET = 'dev-secret-key-change-in-production';

/**
 * Checks the environment once at startup. Missing required variables abort
 * the boot with a clear message; risky-but-working values only warn, so an
 * existing deployment never stops starting because of this check.
 */
const validateEnv = () => {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Faltan variables de entorno obligatorias: ${missing.join(', ')}`);
  }

  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
    logger.warn('JWT_SECRET usa el valor por defecto en producción; cámbialo por uno aleatorio');
  }
};

module.exports = { validateEnv };
