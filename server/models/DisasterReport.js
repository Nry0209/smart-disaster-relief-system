const mongoose = require("mongoose");

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
      enum: ["draft", "active", "pending_inventory", "monitoring", "resolved"],
      default: "active",
    },
    reportedBy: {
      type: String,
      default: "DMC Officer",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DisasterReport", disasterReportSchema);
