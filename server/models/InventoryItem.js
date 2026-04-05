const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    quantityAvailable: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      default: "units",
      trim: true,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    warehouseLocation: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["available", "low_stock", "expired", "damaged"],
      default: "available",
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);