const AnalyticsLog = require('../models/AnalyticsLog');

async function logRequest(req, res, next) {
  const start = Date.now();
  const originalSend = res.send;
  res.send = function (body) {
    res.send = originalSend;
    const duration = Date.now() - start;
    AnalyticsLog.create({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      userAgent: req.get('user-agent') || '',
      ip: req.ip || req.connection?.remoteAddress
    }).catch(() => {});
    return res.send(body);
  };
  next();
}

module.exports = { logRequest };
