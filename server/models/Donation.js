const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
    },
    donorName: {
      type: String,
      required: true,
      trim: true,
    },
    organizationName: {
      type: String,
      trim: true,
      default: "",
    },
    donorType: {
      type: String,
      enum: ["individual", "organization"],
      required: true,
      default: "individual",
    },
    donationType: {
      type: String,
      enum: ["monetary", "inventory"],
      required: true,
      default: "inventory",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    itemType: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      min: 0,
      default: 0,
    },
    amount: {
      type: Number,
      min: 0,
      default: 0,
    },
    expectedDeliveryDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending_verification", "verified", "rejected"],
      default: "pending_verification",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verificationNotes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Donation", donationSchema);