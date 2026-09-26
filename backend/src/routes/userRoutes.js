const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { generalRateLimiter } = require('../middlewares/rateLimitMiddleware');

/**
 * @swagger
 * /api/users/lookup:
 *   get:
 *     summary: Look up a transfer recipient by email
 *     description: >-
 *       Returns only the display name so the UI can confirm the target of a
 *       transfer. Exposes no other account data.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         example: user2@example.com
 *     responses:
 *       200:
 *         description: Recipient found
 *       404:
 *         description: No user with that email
 *       422:
 *         description: Malformed email
 */
router.get('/users/lookup', authMiddleware, generalRateLimiter, userController.lookupRecipient);

module.exports = router;
