const express = require('express');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @openapi
 * /api/google-trends:
 *   get:
 *     summary: Fetch product search interest from Google Trends (simulated)
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema: { type: string }
 *         description: Product/keyword to get trends for
 *     responses:
 *       200: { description: Search interest time series }
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const keyword = req.query.keyword || 'product';
    const now = new Date();
    const series = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (11 - i));
      return {
        date: d.toISOString().slice(0, 7),
        value: 50 + Math.floor(Math.random() * 50),
        region: 'US'
      };
    });
    return res.json({
      success: true,
      keyword,
      data: series
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
