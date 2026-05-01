const mongoose = require('mongoose');

const transportAssetSchema = new mongoose.Schema(
  {
    transportType: {
      type: String,
      required: true,
      trim: true,
    },
    driverName: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

transportAssetSchema.index({ driverName: 1, vehicleNumber: 1 }, { unique: true });

module.exports = mongoose.model('TransportAsset', transportAssetSchema);