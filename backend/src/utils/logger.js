/**
 * Minimal structured logger.
 *
 * Replaces scattered console.log calls with levels and a consistent shape.
 * In development it prints human-readable lines; with LOG_FORMAT=json (or in
 * production) it emits one JSON object per line, which is what log shippers
 * and aggregators expect.
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const threshold = LEVELS[configuredLevel] !== undefined ? LEVELS[configuredLevel] : LEVELS.info;
const useJson = process.env.LOG_FORMAT === 'json' || process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Anything passed after the message is treated as structured context.
const normalizeContext = (extra) => {
  if (!extra) return {};
  if (extra instanceof Error) {
    return { message: extra.message, stack: extra.stack, name: extra.name };
  }
  return extra;
};

const write = (level, message, context) => {
  if (isTest || LEVELS[level] > threshold) return;

  // requestId / userId / durationMs are promoted to the top level so they are
  // easy to filter on; anything else stays nested under `context`.
  const { requestId, userId, durationMs, ...rest } = context || {};
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(requestId ? { requestId } : {}),
    ...(userId ? { userId } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(Object.keys(rest).length ? { context: rest } : {})
  };

  if (useJson) {
    // One JSON object per line: greppable and parseable by any collector.
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }

  const extras = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
  process.stdout.write(`[${payload.timestamp}] ${level.toUpperCase()}: ${message}${extras}\n`);
};

module.exports = {
  error: (message, context) => write('error', message, normalizeContext(context)),
  warn: (message, context) => write('warn', message, normalizeContext(context)),
  info: (message, context) => write('info', message, normalizeContext(context)),
  debug: (message, context) => write('debug', message, normalizeContext(context))
};
