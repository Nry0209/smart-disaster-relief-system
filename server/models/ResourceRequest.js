const mongoose = require("mongoose");
const { ITEM_CATEGORY_ENUM } = require("../utils/constants");

const requestedItemSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: false,
      default: null,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ITEM_CATEGORY_ENUM,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      default: "units",
      trim: true,
    },
  },
  { _id: false }
);

const resourceRequestSchema = new mongoose.Schema(
  {
    // NGO/Partner Information
    ngoPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },

    // Request Type
    requestType: {
      type: String,
      enum: ["inventory", "monetary"],
      required: true,
      default: "inventory",
    },

    // Monetary Request (for monetary requests)
    amount: {
      type: Number,
      min: 0,
      required: function() {
        return this.requestType === "monetary";
      },
    },

    // Inventory Request (for inventory requests)
    items: {
      type: [requestedItemSchema],
      required: function() {
        return this.requestType === "inventory";
      },
      validate: {
        validator: function (items) {
          if (this.requestType === "inventory") {
            return Array.isArray(items) && items.length > 0;
          }
          return true;
        },
        message: "At least one requested item is required for inventory requests.",
      },
    },

    // Delivery Information
    deliveryWarehouse: {
      type: String,
      required: true,
      trim: true,
      enum: ["Colombo Central Warehouse", "Kandy Regional Warehouse"],
    },
    expectedDeliveryDate: {
      type: Date,
      required: true,
    },

    // Problem Description
    problemNote: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // Status and Tracking
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "fulfilled", "rejected"],
      default: "pending",
      required: true,
    },

    // Optional reference to disaster (if applicable)
    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DisasterReport",
      required: false,
    },

    // Admin tracking
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    reviewedAt: {
      type: Date,
      required: false,
    },

    emailSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ResourceRequest", resourceRequestSchema);