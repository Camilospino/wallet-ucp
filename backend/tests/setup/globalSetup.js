const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATION = path.join(__dirname, '../../../database/migrations/01-create_tables.sql');

const url =
  process.env.TEST_DATABASE_URL ||
  'postgresql://walletucp:walletucp_password@localhost:5433/walletucp_test';

/** Connects to `postgres` so we can create the database if it is missing. */
const connectAdmin = () => {
  const parsed = new URL(url);
  return new Client({
    host: parsed.hostname,
    port: parsed.port || 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password || ''),
    database: 'postgres'
  });
};

const ensureDatabase = async () => {
  const dbName = new URL(url).pathname.slice(1);
  const admin = connectAdmin();
  await admin.connect();
  try {
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length === 0) {
      // Identifier cannot be parameterised; dbName comes from our own config.
      await admin.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[test] base de datos "${dbName}" creada`);
    }
  } finally {
    await admin.end();
  }
};

const applySchema = async () => {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    await client.query(sql);
    console.log('[test] esquema aplicado desde 01-create_tables.sql');
  } finally {
    await client.end();
  }
};

module.exports = async () => {
  await ensureDatabase();
  await applySchema();
};
