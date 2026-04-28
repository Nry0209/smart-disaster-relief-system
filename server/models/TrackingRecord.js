const mongoose = require("mongoose");

const trackingRecordSchema = new mongoose.Schema(
  {
    allocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Allocation",
      default: null,
    },
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

    dispatchDate: {
      type: Date,
      default: null,
    },
    transportDetails: {
      type: String,
      trim: true,
      default: "",
    },
    driverName: {
      type: String,
      trim: true,
      default: "",
    },
    vehicleNumber: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "prepared",
        "dispatched",
        "in_transit",
        "delivered",
        "confirmed_delivered",
      ],
      default: "prepared",
    },

    currentLocation: {
      type: String,
      trim: true,
      default: "",
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    confirmationNotes: {
      type: String,
      trim: true,
      default: "",
    },
    receivedByName: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrackingRecord", trackingRecordSchema);