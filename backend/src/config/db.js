const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/salessight';

async function connectDB() {
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB connected');
}

module.exports = { connectDB };
