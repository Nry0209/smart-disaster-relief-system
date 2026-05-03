const mongoose = require("mongoose");

const partnerSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    preferredCategories: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive", "verified"],
      default: "active",
    },
    organizationProfileDocument: {
      type: String,
      trim: true,
      default: "",
    },
    registrationCertificate: {
      type: String,
      trim: true,
      default: "",
    },
    verificationDocument: {
      type: String,
      trim: true,
      default: "",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// index to ensure quick lookups and uniqueness (sparse to avoid conflicts)
partnerSchema.index({ userId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Partner", partnerSchema);