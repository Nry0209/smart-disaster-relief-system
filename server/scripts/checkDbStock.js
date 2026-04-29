const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
require('dotenv').config();

async function checkDatabaseStock() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/disaster-relief');
    console.log('Connected to MongoDB');
    
    // Check if we have inventory items in the database
    const count = await InventoryItem.countDocuments();
    console.log('Total inventory items in DB:', count);
    
    // Get first few items to check stock values
    const items = await InventoryItem.find().limit(5);
    console.log('Sample items:');
    items.forEach(item => {
      console.log(`- ${item.name}: stock=${item.stock}, min=${item.min}, category=${item.category}`);
    });
    
    // Get items with high stock to verify mock data
    const highStockItems = await InventoryItem.find({ stock: { $gte: 10000 } }).limit(3);
    console.log('High stock items (should have mock data values):');
    highStockItems.forEach(item => {
      console.log(`- ${item.name}: stock=${item.stock}, min=${item.min}, category=${item.category}`);
    });
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Database connection error:', error);
  }
}

checkDatabaseStock();
