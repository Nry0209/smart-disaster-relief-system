const mongoose = require("mongoose");

const predictedResourceSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    recommendedQuantity: {
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

const predictionLogSchema = new mongoose.Schema(
  {
    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DisasterReport",
      required: true,
    },
    inputFactors: {
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
    },
    predictedResources: {
      type: [predictedResourceSchema],
      default: [],
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PredictionLog", predictionLogSchema);