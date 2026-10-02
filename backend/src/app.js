const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const walletRoutes = require('./routes/walletRoutes');
const transferRoutes = require('./routes/transferRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes = require('./routes/adminRoutes');

const { errorHandler, notFoundHandler } = require('./middlewares/errorMiddleware');
const { generalRateLimiter } = require('./middlewares/rateLimitMiddleware');
const { requestLogger } = require('./middlewares/requestLogger');

const app = express();

// Security middleware
// HSTS tells the browser to ONLY use HTTPS for 180 days. In development the
// server speaks plain HTTP, so enabling it made the browser upgrade to
// https:// and fail the TLS handshake (blank page). Only send HSTS when
// actually running behind TLS in production.
const isProduction = process.env.NODE_ENV === 'production';

// Behind NGINX the browser's real address arrives in X-Forwarded-For. Express
// ignores that header unless it is told to trust the proxy, and
// express-rate-limit then logs ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and falls
// back to the proxy's address: every client then shares ONE bucket, so the
// login limit is counted across all users instead of per client.
//
// The hop count is 1, never `true`. NGINX is the only proxy in front of the
// app, and `true` would let a direct client forge X-Forwarded-For to dodge the
// rate limit entirely. Enabled only in production because the dev compose
// talks to Express directly with no proxy in between.
if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(helmet({
  strictTransportSecurity: isProduction
    ? { maxAge: 15552000, includeSubDomains: true }
    : false,
  // Swagger UI needs inline styles/scripts to render.
  contentSecurityPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (must come before the routes to time them)
app.use(requestLogger);

// Rate limiting
app.use(generalRateLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api', walletRoutes);
app.use('/api', transferRoutes);
app.use('/api', transactionRoutes);
app.use('/api', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root: this server only exposes JSON, so point people at the right URLs
// instead of returning a bare 404 when they open the host directly.
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'WalletUCP API - Billetera Virtual Académica',
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
      auth: '/api/auth',
      wallet: '/api/wallet',
      transfers: '/api/transfers',
      transactions: '/api/transactions',
      admin: '/api/admin'
    }
  });
});

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WalletUCP API',
      version: '1.0.0',
      description: 'API para billetera virtual académica - Proyecto educativo',
      contact: {
        name: 'WalletUCP Support',
        email: 'support@walletucp.example.com'
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Servidor de desarrollo',
      },
      {
        url: 'https://api.walletucp.example.com',
        description: 'Servidor de producción',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenido al iniciar sesión'
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            error: {
              type: 'string',
              example: 'ERROR_CODE'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            },
            data: {
              type: 'object'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
