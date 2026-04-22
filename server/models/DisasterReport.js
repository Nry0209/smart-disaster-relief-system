const mongoose = require("mongoose");

const MIN_AFFECTED_POPULATION = 1;
const MAX_AFFECTED_POPULATION = 10000000;

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
    severityLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      required: true,
    },
    affectedPeople: {
      type: Number,
      required: true,
      min: 0,
    },
    affectedPopulation: {
      type: Number,
      required: true,
      min: MIN_AFFECTED_POPULATION,
      max: MAX_AFFECTED_POPULATION,
      validate: {
        validator: Number.isInteger,
        message: "affectedPopulation must be a whole number.",
      },
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
    requiredResourceCategories: [
      {
        type: String,
        trim: true,
      },
    ],
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
      enum: ["draft", "active", "pending_inventory", "allocated", "monitoring", "resolved", "open", "closed"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedBy: {
      type: String,
      default: "DMC Officer",
      trim: true,
    },
    confirmedDeliveryBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    allocatedResources: {
      type: allocatedResourcesSchema,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DisasterReport", disasterReportSchema);
