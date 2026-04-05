const mongoose = require('mongoose');

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/smart-disaster-relief';

    const conn = await mongoose.connect(
      mongoUri
    );
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Import models
const InventoryItem = require('./InventoryItem');
const StockLevel = require('./StockLevel');
const StockTransaction = require('./StockTransaction');
const Donation = require('./Donation');
const ResourceRequest = require('./ResourceRequest');
const User = require('./User');

module.exports = {
  connectDB,
  InventoryItem,
  StockLevel,
  StockTransaction,
  Donation,
  ResourceRequest,
  User,
};
