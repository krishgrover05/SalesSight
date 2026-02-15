/**
 * Thin proxy to the ML FastAPI service. No ML logic or data processing.
 * GET /api/recommend-products -> forwards to ML GET /recommend and returns JSON.
 */

const express = require('express');
const router = express.Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS) || 10000;

/**
 * @openapi
 * /api/recommend-products:
 *   get:
 *     summary: Get ML product recommendations (proxy to ML service)
 *     responses:
 *       200: { description: Recommendation list from ML service }
 *       503: { description: ML service unavailable }
 */
router.get('/', async (req, res) => {
  const url = `${ML_SERVICE_URL.replace(/\/$/, '')}/recommend`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: 'ML service error',
        detail: data.detail || data.message || response.statusText
      });
    }

    return res.json(data);
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err.name === 'AbortError';
    const message = isAbort ? 'ML service timeout' : (err.cause?.code === 'ECONNREFUSED' ? 'ML service unreachable' : err.message);
    return res.status(503).json({
      success: false,
      error: 'ML service unavailable',
      detail: message
    });
  }
});

module.exports = router;
