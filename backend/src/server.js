require('dotenv').config();
const app = require('./app');
const pool = require('./config/database');
const logger = require('./utils/logger');
const { validateEnv } = require('./config/env');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    validateEnv();

    // Verify the database is reachable before accepting traffic, so a broken
    // configuration fails fast with a clear message instead of 500s later.
    await pool.query('SELECT NOW()');
    logger.info('Conexión con la base de datos establecida');

    const server = app.listen(PORT, () => {
      logger.info(`Servidor escuchando en el puerto ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        docs: `http://localhost:${PORT}/api-docs`
      });
    });

    // Drain connections so in-flight requests finish before exiting.
    const shutdown = (signal) => {
      logger.info(`Señal ${signal} recibida, cerrando servidor`);
      server.close(async () => {
        await pool.end().catch(() => {});
        process.exit(0);
      });
      // Do not hang forever if a connection refuses to close.
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('No se pudo iniciar el servidor', { error: error.message });
    process.exit(1);
  }
};

startServer();
