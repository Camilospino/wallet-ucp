const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Card:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         usuario_id:
 *           type: integer
 *           example: 2
 *         tipo:
 *           type: string
 *           enum: [CREDIT, DEBIT]
 *         marca:
 *           type: string
 *           enum: [VISA, MASTERCARD]
 *         ultimos_digitos:
 *           type: string
 *           example: '4242'
 *         saldo:
 *           type: number
 *           example: 25000.00
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/cards:
 *   get:
 *     summary: List the two cards (credit and debit) of the authenticated user
 *     description: >
 *       Every user owns exactly one credit and one debit card, each with its
 *       own balance. The wallet balance is always the sum of both.
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     cards:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Card'
 *       401:
 *         description: Unauthorized
 */
router.get('/cards', authMiddleware, cardController.listCards);

module.exports = router;
