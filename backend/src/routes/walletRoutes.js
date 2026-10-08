const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { financialRateLimiter } = require('../middlewares/rateLimitMiddleware');

/**
 * @swagger
 * /api/wallet:
 *   get:
 *     summary: Get wallet information
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet information retrieved successfully
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
 *                     wallet:
 *                       type: object
 *                     recentMovements:
 *                       type: array
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 */
router.get('/wallet', authMiddleware, walletController.getWallet);

/**
 * @swagger
 * /api/wallets/deposit:
 *   post:
 *     summary: Deposit funds to wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 example: 100000
 *               cardId:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *                 description: >
 *                   Optional. Id of one of the user's own cards (GET /api/cards).
 *                   Unknown or foreign cards answer 404 CARD_NOT_FOUND. When
 *                   omitted, the debit card is used.
 *     responses:
 *       200:
 *         description: Deposit successful
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
 *                     wallet:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Wallet blocked
 *       422:
 *         description: Validation error
 */
router.post('/wallets/deposit', authMiddleware, financialRateLimiter, walletController.deposit);

/**
 * @swagger
 * /api/wallets/withdraw:
 *   post:
 *     summary: Withdraw funds from wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 example: 50000
 *               cardId:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *                 description: >
 *                   Optional. Id of one of the user's own cards (GET /api/cards).
 *                   Unknown or foreign cards answer 404 CARD_NOT_FOUND. When
 *                   omitted, the debit card is used.
 *     responses:
 *       200:
 *         description: Withdrawal successful
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
 *                     wallet:
 *                       type: object
 *       400:
 *         description: Insufficient balance
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Wallet blocked
 *       422:
 *         description: Validation error
 */
router.post('/wallets/withdraw', authMiddleware, financialRateLimiter, walletController.withdraw);

module.exports = router;
