const mongoose = require("mongoose");
const { ITEM_CATEGORY_ENUM } = require("../utils/constants");

const inventoryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ITEM_CATEGORY_ENUM,
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
      min: 1,
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
    quantityAvailable: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    activities: {
      type: [
        new mongoose.Schema(
          {
            itemId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem", required: false },
            itemName: { type: String, trim: true, default: "" },
            action: { type: String, trim: true, default: "" },
            type: { type: String, trim: true, default: "" },
            category: { type: String, trim: true, default: "" },
            quantity: { type: Number, default: 0 },
            previousStock: { type: Number, default: 0 },
            newStock: { type: Number, default: 0 },
            note: { type: String, trim: true, default: "" },
            notes: { type: String, trim: true, default: "" },
            metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
            referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
            referenceType: { type: String, trim: true, default: "" },
            performedBy: { type: mongoose.Schema.Types.Mixed, default: null },
            performedByName: { type: String, trim: true, default: "" },
          },
          { timestamps: true }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);
