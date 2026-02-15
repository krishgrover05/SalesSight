const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: String
}, { timestamps: true });

module.exports = mongoose.model('User', schema);
