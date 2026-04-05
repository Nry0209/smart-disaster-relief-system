const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Water', 'Food', 'Medical', 'Shelter'],
  },
  description: {
    type: String,
    trim: true,
  },
  expiryDate: {
    type: Date,
  },
  unit: {
    type: String,
    default: 'units',
  },
  minStockLevel: {
    type: Number,
    default: 0,
    min: 0,
  },
  expiryTracking: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
