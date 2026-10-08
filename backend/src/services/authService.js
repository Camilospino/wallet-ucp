const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const userRepository = require('../repositories/userRepository');
const walletRepository = require('../repositories/walletRepository');
const cardService = require('./cardService');
const { ERROR_CODES, USER_STATES } = require('../config/constants');

/**
 * Strips sensitive fields from a user row before it leaves the service layer.
 * Mutates a copy so the caller never receives password_hash.
 */
const sanitizeUser = (user) => {
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

const register = async (nombre, apellido, email, password, telefono) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await userRepository.findByEmail(normalizedEmail);
  if (existingUser) {
    throw {
      statusCode: 409,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'El email ya está registrado'
    };
  }

  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // The user, its wallet and its two cards must be created together: if any
  // insert failed we would end up with a user that can never do anything.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const user = await userRepository.create(
      nombre,
      apellido,
      normalizedEmail,
      passwordHash,
      telefono,
      client
    );

    await walletRepository.create(user.id, client);
    // Every user owns a credit and a debit card from the start, both at 0.
    await cardService.createDefaultCards(user.id, client);

    await client.query('COMMIT');

    return sanitizeUser(user);
  } catch (error) {
    await client.query('ROLLBACK');

    // Lost the race against a concurrent registration with the same email.
    if (error && error.code === '23505') {
      throw {
        statusCode: 409,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'El email ya está registrado'
      };
    }

    throw error;
  } finally {
    client.release();
  }
};

const login = async (email, password) => {
  const user = await userRepository.findByEmail(email.trim().toLowerCase());
  if (!user) {
    throw {
      statusCode: 401,
      code: ERROR_CODES.AUTHENTICATION_ERROR,
      message: 'Credenciales inválidas'
    };
  }

  // The password is checked BEFORE the account state: otherwise anyone could
  // learn that an email belongs to a blocked account without knowing its
  // password.
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw {
      statusCode: 401,
      code: ERROR_CODES.AUTHENTICATION_ERROR,
      message: 'Credenciales inválidas'
    };
  }

  if (user.estado !== USER_STATES.ACTIVE) {
    throw {
      statusCode: 403,
      code: ERROR_CODES.USER_BLOCKED,
      message: 'Usuario bloqueado'
    };
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  return {
    token,
    user: sanitizeUser(user)
  };
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw {
      statusCode: 401,
      code: ERROR_CODES.AUTHENTICATION_ERROR,
      message: 'Token inválido o expirado'
    };
  }
};

/**
 * Re-reads the user from the database using the id carried by the JWT.
 * The frontend calls this on reload so the session (including `rol`) is
 * restored instead of being guessed from localStorage alone.
 */
const getCurrentUser = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw {
      statusCode: 404,
      code: ERROR_CODES.USER_NOT_FOUND,
      message: 'Usuario no encontrado'
    };
  }

  if (user.estado !== USER_STATES.ACTIVE) {
    throw {
      statusCode: 403,
      code: ERROR_CODES.USER_BLOCKED,
      message: 'Usuario bloqueado'
    };
  }

  return sanitizeUser(user);
};

module.exports = {
  register,
  login,
  verifyToken,
  getCurrentUser
};
