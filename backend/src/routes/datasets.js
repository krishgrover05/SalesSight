const express = require('express');
const multer = require('multer');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * @openapi
 * /api/datasets/upload:
 *   post:
 *     summary: Upload historical datasets (CSV/JSON)
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               productId: { type: string }
 *     responses:
 *       200: { description: Upload result with row count }
 */
router.post('/upload', optionalAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const productId = req.body?.productId || 'default';
    const buf = req.file.buffer;
    const text = buf.toString('utf8');
    let rowCount = 0;
    if (req.file.mimetype === 'application/json' || req.file.originalname.endsWith('.json')) {
      const data = JSON.parse(text);
      rowCount = Array.isArray(data) ? data.length : (data.rows ? data.rows.length : 1);
    } else {
      rowCount = text.split(/\r?\n/).filter(Boolean).length - (text.includes(',') ? 1 : 0) || 0;
    }
    return res.json({
      success: true,
      filename: req.file.originalname,
      productId,
      rowCount: Math.max(1, rowCount),
      size: req.file.size
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
