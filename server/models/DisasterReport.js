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
    severityLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    affectedPeople: {
      type: Number,
      required: true,
      min: 0,
    },
    requiredResourceCategories: [
      {
        type: String,
        trim: true,
      },
    ],
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "active", "resolved", "closed"],
      default: "open",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    confirmedDeliveryBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DisasterReport", disasterReportSchema);