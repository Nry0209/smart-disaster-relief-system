const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: [true, 'Item ID is required'],
  },
  transactionType: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: ['IN', 'OUT', 'ADJUSTMENT'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: 1,
  },
  warehouseLocation: {
    type: String,
    trim: true,
  },
  reason: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);
