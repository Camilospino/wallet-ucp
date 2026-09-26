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
