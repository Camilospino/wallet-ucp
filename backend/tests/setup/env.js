/**
 * Runs BEFORE the application modules are imported, so DATABASE_URL points at
 * the throwaway test database instead of the development one.
 *
 * dotenv does not override already-defined variables, so setting them here
 * guarantees the tests can never touch real data.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://walletucp:walletucp_password@localhost:5433/walletucp_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '4';
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Integration tests talk to a real database, so they need more than the
// 5s default before timing out.
jest.setTimeout(30000);
