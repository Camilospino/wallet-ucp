const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { financialRateLimiter } = require('../middlewares/rateLimitMiddleware');

/**
 * @swagger
 * /api/transfers:
 *   post:
 *     summary: Transfer funds to another user
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientEmail
 *               - amount
 *             properties:
 *               recipientEmail:
 *                 type: string
 *                 format: email
 *                 example: recipient@example.com
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 example: 25000
 *               cardId:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *                 description: >
 *                   Optional. Id of one of the sender's own cards (GET /api/cards).
 *                   Unknown or foreign cards answer 404 CARD_NOT_FOUND. When
 *                   omitted, the sender's debit card is used.
 *               recipientCardType:
 *                 type: string
 *                 enum: [CREDIT, DEBIT]
 *                 nullable: true
 *                 description: Recipient's card the money arrives on (DEBIT when omitted).
 *     responses:
 *       200:
 *         description: Transfer successful
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
 *                     transaction:
 *                       type: object
 *       400:
 *         description: Insufficient balance or invalid transfer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Wallet blocked or user blocked
 *       404:
 *         description: Recipient not found
 *       422:
 *         description: Validation error
 */
router.post('/transfers', authMiddleware, financialRateLimiter, transferController.transfer);

module.exports = router;
