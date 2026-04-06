const mongoose = require("mongoose");

const allocationSchema = new mongoose.Schema(
  {
    disasterReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DisasterReport",
      required: true,
      unique: true,
      index: true,
    },
    quantities: {
      type: Map,
      of: {
        type: Number,
        min: 0,
      },
      default: {},
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },
    allocatedBy: {
      type: String,
      default: "Allocation Officer",
      trim: true,
    },
    allocatedDate: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Allocation", allocationSchema);
