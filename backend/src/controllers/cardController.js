const cardService = require('../services/cardService');

const listCards = async (req, res, next) => {
  try {
    const cards = await cardService.listCards(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Tarjetas obtenidas correctamente',
      data: { cards }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCards
};
