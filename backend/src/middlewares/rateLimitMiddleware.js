const rateLimit = require('express-rate-limit');

/**
 * Builds a rate limiter. Limits are configurable through env vars so they can
 * be relaxed in development without touching the code.
 */
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    limit: max,
    message: {
      success: false,
      message: message,
      error: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

const envInt = (name, fallback) => {
  const parsed = parseInt(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isTest = process.env.NODE_ENV === 'test';

const authRateLimiter = createRateLimiter(
  15 * 60 * 1000,
  envInt('RATE_LIMIT_AUTH_MAX', 20),
  'Too many authentication attempts, please try again later'
);

const financialRateLimiter = createRateLimiter(
  60 * 1000,
  envInt('RATE_LIMIT_FINANCIAL_MAX', 30),
  'Too many financial operations, please try again later'
);

const generalRateLimiter = createRateLimiter(
  15 * 60 * 1000,
  envInt('RATE_LIMIT_GENERAL_MAX', 1000),
  'Too many requests, please try again later'
);

// In tests the limiters are disabled so they never make assertions flaky.
const noopLimiter = (req, res, next) => next();

module.exports = {
  authRateLimiter: isTest ? noopLimiter : authRateLimiter,
  financialRateLimiter: isTest ? noopLimiter : financialRateLimiter,
  generalRateLimiter: isTest ? noopLimiter : generalRateLimiter,
  createRateLimiter
};
