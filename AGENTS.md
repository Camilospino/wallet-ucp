# WalletUCP - Agent Project Information

## Project Overview
WalletUCP is an academic virtual wallet system demonstrating transaction processing with PostgreSQL atomic operations and concurrency control.

## Build and Run Commands

### Backend
```bash
cd backend
npm install
npm run dev          # Development server
npm test             # Run tests
npm run lint         # Run linter
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Run linter
```

### Docker (Recommended)
```bash
docker compose up --build    # Start all services
docker compose down          # Stop all services
docker compose up postgres   # Start only database
```

## Environment Variables

### Backend (.env)
- `PORT=5000`
- `DATABASE_URL=postgresql://walletucp:walletucp_password@postgres:5432/walletucp`
- `JWT_SECRET=dev-secret-key-change-in-production`
- `JWT_EXPIRES_IN=24h`
- `BCRYPT_ROUNDS=10`
- `NODE_ENV=development`
- `CORS_ORIGIN=http://localhost:3000`

### Frontend (.env)
- `VITE_API_URL=http://localhost:5000`

## Test Users
- **Admin**: admin@example.com / Admin123!
- **User1**: user1@example.com / User123!
- **User2**: user2@example.com / User123!

## API Endpoints
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Swagger Docs**: http://localhost:5000/api-docs

## Key Architecture Features
- Layered architecture: routes → controllers → services → repositories → database
- Atomic transactions with BEGIN/COMMIT/ROLLBACK
- Concurrency control with SELECT ... FOR UPDATE
- JWT authentication with bcrypt password hashing
- Input validation on both frontend and backend
- NUMERIC(15,2) for all monetary values (never FLOAT)

## Critical Rule: Transactions Must Pass The Client

Every repository function accepts an optional `client` as its **last** argument
and defaults to the shared pool. When a service opens a transaction it MUST
pass that `client` to every repository call inside it:

```js
const client = await pool.connect();
await client.query('BEGIN');
await walletRepository.lockByUserIdForUpdate(userId, client); // <- client required
await client.query('COMMIT');
```

If a repository call omits `client`, the statement runs on a *different*
connection: `BEGIN`/`COMMIT`/`ROLLBACK` no longer cover it and
`SELECT ... FOR UPDATE` locks are released immediately, silently destroying both
atomicity and concurrency control. Never call a repository without `client`
inside a `withTransaction` callback.

## Money Model: Cards
Every user owns exactly two cards (`tarjetas`): one CREDIT and one DEBIT, each
with its own `saldo`. The wallet balance (`billeteras.saldo`) must ALWAYS equal
the sum of the user's two cards. Any operation that moves money updates the
card AND the wallet by the same amount inside the same `withTransaction`,
locking the wallet first and then the card (`FOR UPDATE`). A withdrawal or
transfer is limited by the chosen card's balance, not the wallet's. When an
API call omits `cardId`, the DEBIT card is used. In a transfer each party may
only ever see its own card, never the other party's card id or balance.

## Rate Limiting
Limits are configurable via `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_FINANCIAL_MAX`
and `RATE_LIMIT_GENERAL_MAX`. They are automatically disabled when
`NODE_ENV=test`.

## Logging
Never use `console.log`. Use the logger in `src/utils/logger.js`:
`logger.info/warn/error(message, context)`. Business errors (those carrying a
`statusCode`) are logged at `warn`; unexpected ones at `error`. Every request
gets a `requestId` (echoed in the `X-Request-Id` header) that is attached to
all logs for that request.

## Tests
`npx jest --selectProjects unit` needs no database; `--selectProjects integration`
needs PostgreSQL (`TEST_DATABASE_URL`, default `walletucp_test` on port 5433).
Integration tests share one database and TRUNCATE it between cases, which is
why `maxWorkers` is 1: running them in parallel makes files wipe each other's
data. When a test asserts on money, assert the exact expected value, not a
delta, and remember that a seeded balance is not backed by a movement row.

## Testing Coverage
- Authentication (register, login, validation)
- Financial operations (deposit, withdraw, transfer)
- Transaction atomicity and rollback scenarios
- Input validation
- Authorization and role-based access
