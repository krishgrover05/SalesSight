const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     requestBody: { content: { application/json: { schema: { type: object, properties: { email: { type: string }, password: { type: string }, name: { type: string } }, required: [email, password] } } } }
 *     responses: { 201: { description: User created }, 400: { description: Bad request } }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    const user = await User.create({
      email,
      passwordHash: Buffer.from(password).toString('base64'),
      name: name || email.split('@')[0]
    });
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ success: true, token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login and get JWT
 *     requestBody: { content: { application/json: { schema: { type: object, properties: { email: { type: string }, password: { type: string } }, required: [email, password] } } } }
 *     responses: { 200: { description: Token and user }, 401: { description: Invalid credentials } }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    const user = await User.findOne({ email });
    if (!user || user.passwordHash !== Buffer.from(password).toString('base64')) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user (requires JWT)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: User info }, 401: { description: Unauthorized } }
 */
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  return res.json({ success: true, user: { id: user._id, email: user.email, name: user.name } });
});

module.exports = router;
