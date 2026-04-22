const mongoose = require("mongoose");
const Donation = require("../models/Donation");
const Partner = require("../models/Partner");
const InventoryItem = require("../models/InventoryItem");
const InventoryActivity = require("../models/InventoryActivity");

const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

function normalizeDonationPayload(payload = {}) {
  const donorType = payload.donorType === "organization" ? "organization" : "individual";
  const donationType = payload.donationType === "monetary" ? "monetary" : "inventory";

  return {
    donorType,
    donationType,
    donorName: String(payload.donorName || "").trim(),
    organizationName: String(payload.organizationName || "").trim(),
    email: String(payload.email || "").trim(),
    phone: String(payload.phone || "").trim(),
    itemType: String(payload.itemType || "").trim(),
    category: String(payload.category || "").trim(),
    quantity: Number(payload.quantity),
    amount: Number(payload.amount),
    expectedDeliveryDate: payload.expectedDeliveryDate || null,
    partnerId: payload.partnerId || null,
  };
}

// Create donation (Public submission)
async function createDonation(req, res) {
  try {
    const {
      donorType,
      donationType,
      donorName,
      organizationName,
      email,
      phone,
      itemType,
      category,
      quantity,
      amount,
      expectedDeliveryDate,
      partnerId
    } = normalizeDonationPayload(req.body);

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!donorName) {
      return res.status(400).json({ message: "Donor name is required." });
    }

    if (donorType === "organization" && !organizationName) {
      return res.status(400).json({ message: "Organization name is required for organization donors." });
    }

    if (donationType === "inventory") {
      if (!itemType || !Number.isFinite(quantity)) {
        return res.status(400).json({
          message: "For inventory donations, item type and a valid quantity are required."
        });
      }

      if (quantity < 0) {
        return res.status(400).json({
          message: "Invalid count. Quantity cannot be negative."
        });
      }

      if (quantity === 0) {
        return res.status(400).json({
          message: "For inventory donations, quantity must be greater than zero."
        });
      }
    }

    if (donationType === "monetary") {
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          message: "For monetary donations, a valid amount is required."
        });
      }
    }

    // Validate partner if provided
    if (partnerId) {
      const partner = await Partner.findById(partnerId);
      if (!partner) {
        return res.status(404).json({ message: "Partner organization not found." });
      }
    }

    const donation = new Donation({
      partnerId: partnerId || null,
      donorType,
      donationType,
      donorName,
      organizationName: donorType === "organization" ? organizationName : "",
      email: email || "",
      phone: phone || "",
      itemType: donationType === "inventory" ? itemType : "",
      category: donationType === "inventory" ? category || "" : "monetary",
      quantity: donationType === "inventory" ? quantity : 0,
      amount: donationType === "monetary" ? amount : 0,
      expectedDeliveryDate: donationType === "inventory" ? expectedDeliveryDate || null : null,
      status: "pending_verification"
    });

    await donation.save();

    return res.status(201).json({
      message: "Donation submitted successfully. It will be reviewed by our inventory team.",
      donation
    });

  } catch (error) {
    console.error("Create donation error:", error);
    return res.status(500).json({ 
      message: "Failed to submit donation.", 
      error: error.message 
    });
  }
}

// Get all donations (Inventory Officer)
async function listDonations(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { page = 1, limit = 10, status, category } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;

    const donations = await Donation.find(filter)
      .populate('partnerId', 'name email')
      .populate('verifiedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Donation.countDocuments(filter);

    return res.json({
      donations,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("List donations error:", error);
    return res.status(500).json({ 
      message: "Failed to retrieve donations.", 
      error: error.message 
    });
  }
}

// Get donation by ID
async function getDonationById(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid donation ID." });
    }

    const donation = await Donation.findById(id)
      .populate('partnerId', 'name email phone')
      .populate('verifiedBy', 'fullName email');

    if (!donation) {
      return res.status(404).json({ message: "Donation not found." });
    }

    return res.json({ donation });

  } catch (error) {
    console.error("Get donation error:", error);
    return res.status(500).json({ 
      message: "Failed to retrieve donation.", 
      error: error.message 
    });
  }
}

// Verify donation (Inventory Officer)
async function verifyDonation(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;
    const { status, verificationNotes, inventoryItemId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid donation ID." });
    }

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'verified' or 'rejected'." });
    }

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ message: "Donation not found." });
    }

    if (donation.status !== "pending_verification") {
      return res.status(400).json({ 
        message: "Donation has already been processed." 
      });
    }

    // Update donation status
    donation.status = status;
    donation.verifiedBy = req.user.id;
    donation.verificationNotes = verificationNotes || "";

    // If approved and this is an inventory donation, update inventory stock.
    if (status === "verified" && donation.donationType === "inventory") {
      if (!inventoryItemId) {
        return res.status(400).json({ 
          message: "Inventory item ID is required for verified inventory donations." 
        });
      }

      const inventoryItem = await InventoryItem.findById(inventoryItemId);
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found." });
      }

      // Update inventory stock
      const previousStock = inventoryItem.stock;
      inventoryItem.stock += donation.quantity;
      inventoryItem.lastUpdatedBy = req.user.id;
      await inventoryItem.save();

      // Create inventory activity record
      const activity = new InventoryActivity({
        itemId: inventoryItem._id,
        itemName: inventoryItem.name,
        action: "donation",
        quantity: donation.quantity,
        previousStock,
        newStock: inventoryItem.stock,
        note: `Donation from ${donation.donorName}${donation.email ? ` (${donation.email})` : ""}`,
        metadata: {
          donationId: donation._id.toString(),
          donationType: donation.donationType,
          category: inventoryItem.category,
        },
        performedBy: req.user.fullName || req.user.name || req.user.id,
      });

      await activity.save();
    }

    await donation.save();

    return res.json({
      message: `Donation ${status} successfully.`,
      donation
    });

  } catch (error) {
    console.error("Verify donation error:", error);
    return res.status(500).json({ 
      message: "Failed to verify donation.", 
      error: error.message 
    });
  }
}

// Update donation
async function updateDonation(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;
    const {
      donorType,
      donationType,
      donorName,
      organizationName,
      email,
      phone,
      itemType,
      category,
      quantity,
      amount,
      expectedDeliveryDate,
    } = normalizeDonationPayload(req.body);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid donation ID." });
    }

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ message: "Donation not found." });
    }

    // Only allow updates if still pending verification
    if (donation.status !== "pending_verification") {
      return res.status(400).json({ 
        message: "Cannot update donation after verification." 
      });
    }

    if (!donorName) {
      return res.status(400).json({ message: "Donor name is required." });
    }

    if (donorType === "organization" && !organizationName) {
      return res.status(400).json({ message: "Organization name is required for organization donors." });
    }

    if (donationType === "inventory") {
      if (!itemType || !Number.isFinite(quantity)) {
        return res.status(400).json({
          message: "For inventory donations, item type and a valid quantity are required."
        });
      }

      if (quantity < 0) {
        return res.status(400).json({
          message: "Invalid count. Quantity cannot be negative."
        });
      }

      if (quantity === 0) {
        return res.status(400).json({
          message: "For inventory donations, quantity must be greater than zero."
        });
      }
    }

    if (donationType === "monetary") {
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          message: "For monetary donations, a valid amount is required."
        });
      }
    }

    donation.donorType = donorType;
    donation.donationType = donationType;
    donation.donorName = donorName;
    donation.organizationName = donorType === "organization" ? organizationName : "";
    donation.email = email;
    donation.phone = phone;
    donation.itemType = donationType === "inventory" ? itemType : "";
    donation.category = donationType === "inventory" ? category : "monetary";
    donation.quantity = donationType === "inventory" ? quantity : 0;
    donation.amount = donationType === "monetary" ? amount : 0;
    donation.expectedDeliveryDate = donationType === "inventory" ? expectedDeliveryDate : null;

    await donation.save();

    return res.json({
      message: "Donation updated successfully.",
      donation
    });

  } catch (error) {
    console.error("Update donation error:", error);
    return res.status(500).json({ 
      message: "Failed to update donation.", 
      error: error.message 
    });
  }
}

// Delete donation (Admin only)
async function deleteDonation(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid donation ID." });
    }

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ message: "Donation not found." });
    }

    // Only allow deletion if still pending verification
    if (donation.status !== "pending_verification") {
      return res.status(400).json({ 
        message: "Cannot delete donation after verification." 
      });
    }

    await Donation.findByIdAndDelete(id);

    return res.json({
      message: "Donation deleted successfully."
    });

  } catch (error) {
    console.error("Delete donation error:", error);
    return res.status(500).json({ 
      message: "Failed to delete donation.", 
      error: error.message 
    });
  }
}

// Get donation statistics
async function getDonationStatistics(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const stats = await Donation.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" }
        }
      }
    ]);

    const donationTypeStats = await Donation.aggregate([
      {
        $group: {
          _id: "$donationType",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalQuantity: { $sum: "$quantity" }
        }
      }
    ]);

    const categoryStats = await Donation.aggregate([
      {
        $match: { status: "verified" }
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" }
        }
      }
    ]);

    return res.json({
      statusStats: stats,
      categoryStats: categoryStats,
      donationTypeStats
    });

  } catch (error) {
    console.error("Get donation statistics error:", error);
    return res.status(500).json({ 
      message: "Failed to retrieve donation statistics.", 
      error: error.message 
    });
  }
}

module.exports = {
  createDonation,
  listDonations,
  getDonationById,
  verifyDonation,
  updateDonation,
  deleteDonation,
  getDonationStatistics
};
