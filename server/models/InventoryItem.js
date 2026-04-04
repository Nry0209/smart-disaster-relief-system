const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["Water", "Food", "Medical", "Shelter", "Clothing", "Other"],
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    min: {
      type: Number,
      required: true,
      min: 0,
    },
    warehouse: {
      type: String,
      default: "Warehouse 1",
      trim: true,
    },
    unit: {
      type: String,
      default: "units",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);
