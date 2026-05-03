const mongoose = require("mongoose");
const Donation = require("../models/Donation");
const Partner = require("../models/Partner");
const InventoryItem = require("../models/InventoryItem");
const ResourceRequest = require("../models/ResourceRequest");
const inventoryActivityService = require("../services/inventoryActivityService");

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
    items: Array.isArray(payload.items) ? payload.items : [],
    quantity: Number(payload.quantity),
    amount: Number(payload.amount),
    expectedDeliveryDate: payload.expectedDeliveryDate || null,
    partnerId: payload.partnerId || null,
    sourceResourceRequestId: payload.sourceResourceRequestId || null,
  };
}
// Create NGO donation (Authenticated NGO partners only)
async function createNGODonation(req, res) {
  try {
    // Extract authenticated user ID (NGO staff user)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required for NGO donations." });
    }

    // Find partner by linked userId first, then by user email
    let partner = await Partner.findOne({ userId: userId });
    if (!partner) {
      partner = await Partner.findOne({ email: req.user?.email });
    }

    if (!partner) {
      // If Partner doesn't exist, create one from user data and link to user
      partner = new Partner({
        organizationName: req.user?.organizationName || req.user?.email?.split('@')[0] || 'Unknown NGO',
        contactPerson: req.user?.fullName || req.user?.email,
        email: req.user?.email,
        status: 'active',
        createdBy: userId,
        userId: userId
      });
      await partner.save();
    }

    const {
      donationType,
      organizationName,
      email,
      phone,
      items,
      amount,
      expectedDeliveryDate,
      sourceResourceRequestId,
      notes
    } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const resolvedOrganizationName = String(
      partner.organizationName || organizationName || req.user?.organizationName || req.user?.fullName || "Unknown NGO"
    ).trim();
    const resolvedEmail = String(partner.email || email || req.user?.email || "").trim();
    const resolvedPhone = String(partner.phone || phone || req.user?.phone || "").trim();

    const normalizedDonationType = donationType === "monetary" ? "monetary" : "inventory";

    let normalizedInventoryItems = [];
    let totalInventoryQuantity = 0;

    if (normalizedDonationType === "inventory") {
      try {
        const normalized = await normalizeInventoryDonationItems({
          items,
          itemType: "",
          category: "",
          quantity: 0,
        });

        normalizedInventoryItems = normalized.normalizedItems;
        totalInventoryQuantity = normalized.totalQuantity;
      } catch (validationError) {
        return res.status(400).json({ message: validationError.message });
      }

      if (!normalizedInventoryItems.length || totalInventoryQuantity <= 0) {
        return res.status(400).json({
          message: "For inventory donations, select at least one inventory item and quantity."
        });
      }
    }

    if (normalizedDonationType === "monetary") {
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          message: "For monetary donations, a valid amount greater than 0 is required."
        });
      }
    }

    let linkedResourceRequest = null;
    if (sourceResourceRequestId) {
      if (!mongoose.Types.ObjectId.isValid(sourceResourceRequestId)) {
        return res.status(400).json({ message: "Invalid resource request ID." });
      }

      linkedResourceRequest = await ResourceRequest.findById(sourceResourceRequestId).populate(
        "ngoPartner",
        "organizationName contactPerson email phone userId"
      );

      if (!linkedResourceRequest) {
        return res.status(404).json({ message: "Resource request not found." });
      }

      if (String(linkedResourceRequest.ngoPartner?._id || linkedResourceRequest.ngoPartner) !== String(partner._id)) {
        return res.status(403).json({ message: "This resource request does not belong to your NGO." });
      }
    }

    const donation = new Donation({
      partnerId: partner._id,  // NGO donations reference Partner, not User
      userId: userId,           // Keep userId for audit trail
      donorType: "organization",
      donationType: normalizedDonationType,
      donorName: resolvedOrganizationName,
      organizationName: resolvedOrganizationName,
      email: resolvedEmail,
      phone: resolvedPhone,
      items: normalizedDonationType === "inventory" ? normalizedInventoryItems : [],
      itemType: normalizedDonationType === "inventory" ? normalizedInventoryItems[0]?.itemName || "" : "",
      category: normalizedDonationType === "inventory" ? normalizedInventoryItems[0]?.category || "" : "",
      quantity: normalizedDonationType === "inventory" ? totalInventoryQuantity : 0,
      amount: normalizedDonationType === "monetary" ? Number(amount) : 0,
      expectedDeliveryDate: normalizedDonationType === "inventory" ? expectedDeliveryDate || null : null,
      sourceResourceRequestId: linkedResourceRequest ? linkedResourceRequest._id : null,
      status: "pending_verification",
      notes: String(notes || "").trim()
    });

    await donation.save();

    return res.status(201).json({
      message: "Donation submitted successfully. It will be reviewed by our inventory team.",
      donation
    });

  } catch (error) {
    console.error("Create NGO donation error:", error);
    return res.status(500).json({ 
      message: "Failed to submit donation.", 
      error: error.message 
    });
  }
}


function normalizeLineQuantity(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : null;
}

async function normalizeInventoryDonationItems({ items, itemType, category, quantity }) {
  let requestedItems = Array.isArray(items) ? items : [];

  // Backward compatibility for older clients that still submit single-item payloads.
  if (!requestedItems.length && itemType) {
    requestedItems = [
      {
        itemName: itemType,
        category,
        quantity,
      },
    ];
  }

  if (!requestedItems.length) {
    return { normalizedItems: [], totalQuantity: 0 };
  }

  const normalizedRequestedItems = requestedItems.map((item) => ({
    inventoryItemId: String(item.inventoryItemId || "").trim(),
    itemName: String(item.itemName || item.itemType || "").trim(),
    category: String(item.category || "").trim(),
    quantity: normalizeLineQuantity(item.quantity),
  }));

  const hasExplicitInventoryIds = normalizedRequestedItems.every((item) => item.inventoryItemId);
  let inventoryItemsById = new Map();

  if (hasExplicitInventoryIds) {
    const uniqueIds = [...new Set(normalizedRequestedItems.map((item) => item.inventoryItemId))];

    const inventoryItems = await InventoryItem.find({
      _id: { $in: uniqueIds },
    });

    inventoryItemsById = new Map(inventoryItems.map((entry) => [String(entry._id), entry]));

    if (inventoryItemsById.size !== uniqueIds.length) {
      throw new Error("One or more selected inventory items were not found.");
    }
  }

  const normalizedItems = [];

  for (const item of normalizedRequestedItems) {
    if (!item.quantity) {
      throw new Error("Each selected inventory item must include a quantity greater than zero.");
    }

    let inventoryItem = null;

    if (item.inventoryItemId) {
      inventoryItem = inventoryItemsById.get(item.inventoryItemId);
    } else {
      const nameQuery = item.itemName;
      const categoryQuery = item.category;

      if (!nameQuery || !categoryQuery) {
        throw new Error("Each selected inventory item must include category and item name.");
      }

      inventoryItem = await InventoryItem.findOne({
        name: { $regex: `^${nameQuery.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, $options: "i" },
        category: { $regex: `^${categoryQuery.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, $options: "i" },
      });
    }

    if (!inventoryItem) {
      throw new Error(`Inventory item '${item.itemName || "(unknown)"}' in category '${item.category || "(unknown)"}' was not found.`);
    }

    if (
      item.itemName &&
      item.itemName.toLowerCase() !== String(inventoryItem.name || "").toLowerCase()
    ) {
      throw new Error(`Item name '${item.itemName}' does not match selected inventory record.`);
    }

    if (
      item.category &&
      item.category.toLowerCase() !== String(inventoryItem.category || "").toLowerCase()
    ) {
      throw new Error(`Category '${item.category}' does not match selected inventory record.`);
    }

    normalizedItems.push({
      inventoryItemId: inventoryItem._id,
      itemName: inventoryItem.name,
      category: inventoryItem.category,
      quantity: item.quantity,
    });
  }

  const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
  return { normalizedItems, totalQuantity };
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
      items,
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

    let normalizedInventoryItems = [];
    let totalInventoryQuantity = 0;

    if (donationType === "inventory") {
      try {
        const normalized = await normalizeInventoryDonationItems({
          items,
          itemType,
          category,
          quantity,
        });

        normalizedInventoryItems = normalized.normalizedItems;
        totalInventoryQuantity = normalized.totalQuantity;
      } catch (validationError) {
        return res.status(400).json({ message: validationError.message });
      }

      if (!normalizedInventoryItems.length || totalInventoryQuantity <= 0) {
        return res.status(400).json({
          message: "For inventory donations, select at least one inventory item and quantity."
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
      items: donationType === "inventory" ? normalizedInventoryItems : [],
      itemType: donationType === "inventory" ? normalizedInventoryItems[0]?.itemName || "" : "",
      category: donationType === "inventory" ? normalizedInventoryItems[0]?.category || "" : "",
      quantity: donationType === "inventory" ? totalInventoryQuantity : 0,
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
    if (category) {
      filter.$or = [
        { category },
        { "items.category": category },
      ];
    }

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
    const { status, verificationNotes } = req.body;

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
      let donationItems = Array.isArray(donation.items) ? donation.items : [];

      if (!donationItems.length && donation.itemType && donation.category && donation.quantity > 0) {
        const legacyInventoryItem = await InventoryItem.findOne({
          name: { $regex: `^${String(donation.itemType).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, $options: "i" },
          category: { $regex: `^${String(donation.category).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, $options: "i" },
        });

        if (legacyInventoryItem) {
          donationItems = [
            {
              inventoryItemId: legacyInventoryItem._id,
              itemName: legacyInventoryItem.name,
              category: legacyInventoryItem.category,
              quantity: donation.quantity,
            },
          ];
          donation.items = donationItems;
        }
      }

      if (!donationItems.length) {
        return res.status(400).json({
          message: "Donation has no inventory item lines to verify."
        });
      }

      for (const donationItem of donationItems) {
        const inventoryItem = await InventoryItem.findById(donationItem.inventoryItemId);
        if (!inventoryItem) {
          return res.status(404).json({
            message: `Inventory item not found for donated item '${donationItem.itemName}'.`
          });
        }

        const previousStock = inventoryItem.stock;
        inventoryItem.stock += donationItem.quantity;
        inventoryItem.lastUpdatedBy = req.user.id;
        await inventoryItem.save();

        await inventoryActivityService.createActivity({
          itemId: inventoryItem._id,
          itemName: inventoryItem.name,
          action: "restock",
          quantity: donationItem.quantity,
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
      }
    }

    if (donation.sourceResourceRequestId) {
      await ResourceRequest.findByIdAndUpdate(donation.sourceResourceRequestId, {
        status: status === "verified" ? "fulfilled" : "rejected",
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      });
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
      items,
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

    let normalizedInventoryItems = [];
    let totalInventoryQuantity = 0;

    if (donationType === "inventory") {
      try {
        const normalized = await normalizeInventoryDonationItems({
          items,
          itemType,
          category,
          quantity,
        });

        normalizedInventoryItems = normalized.normalizedItems;
        totalInventoryQuantity = normalized.totalQuantity;
      } catch (validationError) {
        return res.status(400).json({ message: validationError.message });
      }

      if (!normalizedInventoryItems.length || totalInventoryQuantity <= 0) {
        return res.status(400).json({
          message: "For inventory donations, select at least one inventory item and quantity."
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
    donation.items = donationType === "inventory" ? normalizedInventoryItems : [];
    donation.itemType = donationType === "inventory" ? normalizedInventoryItems[0]?.itemName || "" : "";
    donation.category = donationType === "inventory" ? normalizedInventoryItems[0]?.category || "" : "monetary";
    donation.quantity = donationType === "inventory" ? totalInventoryQuantity : 0;
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
    createNGODonation,
  listDonations,
  getDonationById,
  verifyDonation,
  updateDonation,
  deleteDonation,
  getDonationStatistics
};
