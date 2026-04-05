const mongoose = require('mongoose');

const stockLevelSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: [true, 'Item ID is required'],
  },
  warehouseLocation: {
    type: String,
    required: [true, 'Warehouse location is required'],
    trim: true,
  },
  currentStock: {
    type: Number,
    default: 0,
    min: 0,
  },
  minStock: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound index to ensure unique item-warehouse combination
stockLevelSchema.index({ itemId: 1, warehouseLocation: 1 }, { unique: true });

module.exports = mongoose.model('StockLevel', stockLevelSchema);
