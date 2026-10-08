const authService = require('../services/authService');
const { validateRegister, validateLogin } = require('../validators/authValidator');
const register = async (req, res, next) => {
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
    next(error);
  }
};

const login = async (req, res, next) => {
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
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Usuario obtenido correctamente',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  me
};
