const pool = require('../config/database');
const { USER_STATES, USER_ROLES } = require('../config/constants');

// Every function accepts an optional `client` as its LAST argument so it can
// join an open transaction started by the service layer.
const create = async (nombre, apellido, email, passwordHash, telefono = null, client = pool) => {
  const query = `
    INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, estado, rol)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, nombre, apellido, email, telefono, estado, rol, created_at
  `;
  const values = [nombre, apellido, email, passwordHash, telefono, USER_STATES.ACTIVE, USER_ROLES.USER];
  
  const result = await client.query(query, values);
  return result.rows[0];
};

const findByEmail = async (email, client = pool) => {
  const query = 'SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1)';
  const result = await client.query(query, [email]);
  return result.rows[0];
};

const findById = async (id, client = pool) => {
  const query = 'SELECT id, nombre, apellido, email, telefono, estado, rol, created_at FROM usuarios WHERE id = $1';
  const result = await client.query(query, [id]);
  return result.rows[0];
};

const updateState = async (id, estado, client = pool) => {
  const query = `
    UPDATE usuarios 
    SET estado = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, nombre, apellido, email, estado, rol
  `;
  const result = await client.query(query, [estado, id]);
  return result.rows[0];
};

const getAll = async (limit = 50, offset = 0, client = pool) => {
  const query = `
    SELECT id, nombre, apellido, email, telefono, estado, rol, created_at
    FROM usuarios
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;
  const result = await client.query(query, [limit, offset]);
  return result.rows;
};

const count = async (client = pool) => {
  const query = 'SELECT COUNT(*) FROM usuarios';
  const result = await client.query(query);
  return parseInt(result.rows[0].count);
};

module.exports = {
  create,
  findByEmail,
  findById,
  updateState,
  getAll,
  count
};
