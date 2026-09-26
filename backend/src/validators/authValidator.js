const { ERROR_CODES } = require('../config/constants');

const validateRegister = (data) => {
  const errors = [];
  
  if (!data.nombre || data.nombre.trim().length < 2) {
    errors.push('Nombre debe tener al menos 2 caracteres');
  }
  
  if (!data.apellido || data.apellido.trim().length < 2) {
    errors.push('Apellido debe tener al menos 2 caracteres');
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email inválido');
  }
  
  if (!data.password || data.password.length < 8) {
    errors.push('Contraseña debe tener al menos 8 caracteres');
  }
  
  if (data.telefono && data.telefono.trim().length < 10) {
    errors.push('Teléfono debe tener al menos 10 caracteres');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    errorCode: errors.length > 0 ? ERROR_CODES.VALIDATION_ERROR : null
  };
};

const validateLogin = (data) => {
  const errors = [];
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email inválido');
  }
  
  if (!data.password) {
    errors.push('Contraseña requerida');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    errorCode: errors.length > 0 ? ERROR_CODES.VALIDATION_ERROR : null
  };
};

module.exports = {
  validateRegister,
  validateLogin
};
