const mongoose = require("mongoose");

const allocationItemSchema = new mongoose.Schema(
  {
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    quantityAllocated: {
      type: Number,
      required: true,
      min: 1,
    },
    stockAvailableAtAllocation: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unit: {
      type: String,
      default: "units",
      trim: true,
    },
    packageSize: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const allocationSchema = new mongoose.Schema(
  {
    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DisasterReport",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [allocationItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "At least one allocated item is required.",
      },
    },
    allocationDays: {
      type: Number,
      required: false,
      min: 1,
      default: 1,
    },
    status: {
      type: String,
      enum: ["draft", "confirmed", "cancelled"],
      default: "draft",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    allocatedBy: {
      type: String,
      trim: true,
      default: "Allocation Officer",
    },
    allocatedDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Allocation", allocationSchema);