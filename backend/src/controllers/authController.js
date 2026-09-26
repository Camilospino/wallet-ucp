const authService = require('../services/authService');
const { validateRegister, validateLogin } = require('../validators/authValidator');
const register = async (req, res) => {
  try {
    const validation = validateRegister(req.body);
    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        message: validation.errors.join(', '),
        error: validation.errorCode
      });
    }

    const { nombre, apellido, email, password, telefono } = req.body;
    const user = await authService.register(nombre, apellido, email, password, telefono);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: { user }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al registrar usuario',
      error: error.code || 'INTERNAL_ERROR'
    });
  }
};

const login = async (req, res) => {
  try {
    const validation = validateLogin(req.body);
    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        message: validation.errors.join(', '),
        error: validation.errorCode
      });
    }

    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al iniciar sesión',
      error: error.code || 'INTERNAL_ERROR'
    });
  }
};

const me = async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Usuario obtenido correctamente',
      data: { user }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al obtener usuario',
      error: error.code || 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  register,
  login,
  me
};
