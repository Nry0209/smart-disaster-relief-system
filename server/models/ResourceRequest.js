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
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    ngoEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DisasterReport",
      required: true,
    },
    disasterType: {
      type: String,
      required: true,
      trim: true,
    },
    disasterLocation: {
      type: String,
      required: true,
      trim: true,
    },

    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
    },

    requestedItems: {
      type: [requestedItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "At least one requested item is required.",
      },
    },

    deliveryDate: {
      type: Date,
      required: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
      trim: true,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedByName: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["sent", "fulfilled", "cancelled"],
      default: "sent",
      required: true,
    },

    emailSentAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ResourceRequest", resourceRequestSchema);