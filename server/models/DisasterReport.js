const mongoose = require("mongoose");

const allocationLineItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      required: true,
      trim: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const allocatedResourcesSchema = new mongoose.Schema(
  {
    quantities: {
      type: Map,
      of: Number,
      default: {},
    },
    lineItems: {
      type: [allocationLineItemSchema],
      default: [],
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },
    allocatedDate: {
      type: Date,
      default: null,
    },
    allocatedBy: {
      type: String,
      default: "",
      trim: true,
    },
    lastUpdated: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const disasterReportSchema = new mongoose.Schema(
  {
    disasterType: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      required: true,
    },
    affectedPopulation: {
      type: Number,
      required: true,
      min: 0,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      required: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    immediateNeeds: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "active", "pending_inventory", "allocated", "monitoring", "resolved"],
      default: "active",
    },
    reportedBy: {
      type: String,
      default: "DMC Officer",
      trim: true,
    },
    allocatedResources: {
      type: allocatedResourcesSchema,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DisasterReport", disasterReportSchema);
