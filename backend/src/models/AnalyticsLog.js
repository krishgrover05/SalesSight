const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  method: String,
  path: String,
  statusCode: Number,
  durationMs: Number,
  userAgent: String,
  ip: String
}, { timestamps: true });

module.exports = mongoose.model('AnalyticsLog', schema);
