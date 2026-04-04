const mongoose = require("mongoose");

const inventoryActivitySchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: false,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      enum: ["create", "update", "adjust", "transfer", "donation", "consume", "restock", "delete"],
      required: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    previousStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    newStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    performedBy: {
      type: String,
      default: "Inventory Officer",
      trim: true,
    },
  },
  { timestamps: true }
);

inventoryActivitySchema.index({ createdAt: -1 });

module.exports = mongoose.model("InventoryActivity", inventoryActivitySchema);
