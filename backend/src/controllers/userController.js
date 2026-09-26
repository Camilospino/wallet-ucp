const userRepository = require('../repositories/userRepository');
const { ERROR_CODES } = require('../config/constants');

/**
 * Looks up a transfer recipient by email so the UI can show a name instead of
 * making the user type an email blind.
 *
 * Only the display name is returned: no email, phone, role, state or wallet
 * data, so this endpoint cannot be used to enumerate accounts or profile them.
 */
const lookupRecipient = async (req, res) => {
  try {
    const email = (req.query.email || '').trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(422).json({
        success: false,
        message: 'Email inválido',
        error: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const user = await userRepository.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No existe ningún usuario con ese correo',
        error: ERROR_CODES.USER_NOT_FOUND
      });
    }

    res.status(200).json({
      success: true,
      message: 'Destinatario encontrado',
      data: {
        // Deliberately minimal: just enough to confirm the transfer target.
        nombre: `${user.nombre} ${user.apellido}`.trim(),
        inicial: user.nombre ? user.nombre.charAt(0).toUpperCase() : '?'
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error al buscar el destinatario',
      error: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
};

module.exports = { lookupRecipient };
