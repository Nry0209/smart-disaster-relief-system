const mongoose = require("mongoose");
const Partner = require("../models/Partner");

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function formatPartner(partner) {
  return {
    _id: partner._id,
    organizationName: partner.organizationName,
    contactPerson: partner.contactPerson,
    email: partner.email,
    phone: partner.phone,
    address: partner.address,
    registrationNumber: partner.registrationNumber,
    preferredCategories: partner.preferredCategories || [],
    status: partner.status,
    organizationProfileDocument: partner.organizationProfileDocument || "",
    registrationCertificate: partner.registrationCertificate || "",
    verificationDocument: partner.verificationDocument || "",
    createdBy: partner.createdBy,
    createdAt: partner.createdAt,
    updatedAt: partner.updatedAt,
  };
}

async function listPartners(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { status, search } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { organizationName: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const partners = await Partner.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        partners: partners.map(formatPartner),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch partners.",
      error: error.message,
    });
  }
}

async function createPartner(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const {
      organizationName,
      contactPerson,
      email,
      phone,
      address,
      registrationNumber,
      preferredCategories,
      status,
      organizationProfileDocument,
      registrationCertificate,
      verificationDocument,
    } = req.body;

    if (!organizationName || !email) {
      return res.status(400).json({
        success: false,
        message: "organizationName and email are required.",
      });
    }

    const existingPartner = await Partner.findOne({ email: String(email).toLowerCase() });
    if (existingPartner) {
      return res.status(400).json({
        success: false,
        message: "Partner with this email already exists.",
      });
    }

    const partner = await Partner.create({
      organizationName: String(organizationName).trim(),
      contactPerson: String(contactPerson || "").trim(),
      email: String(email).toLowerCase().trim(),
      phone: String(phone || "").trim(),
      address: String(address || "").trim(),
      registrationNumber: String(registrationNumber || "").trim(),
      preferredCategories: Array.isArray(preferredCategories) ? preferredCategories : [],
      status: status || "active",
      organizationProfileDocument: String(organizationProfileDocument || "").trim(),
      registrationCertificate: String(registrationCertificate || "").trim(),
      verificationDocument: String(verificationDocument || "").trim(),
      createdBy: req.user?.id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Partner created successfully.",
      data: {
        partner: formatPartner(partner),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create partner.",
      error: error.message,
    });
  }
}

async function getPartnerById(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid partner ID." });
    }

    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found." });
    }

    return res.json({
      success: true,
      data: {
        partner: formatPartner(partner),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch partner.",
      error: error.message,
    });
  }
}

async function updatePartner(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid partner ID." });
    }

    const updates = {};
    const allowedFields = [
      "organizationName",
      "contactPerson",
      "email",
      "phone",
      "address",
      "registrationNumber",
      "preferredCategories",
      "status",
      "organizationProfileDocument",
      "registrationCertificate",
      "verificationDocument",
    ];

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(updates, "email")) {
      updates.email = String(updates.email || "").trim().toLowerCase();
      if (!updates.email) {
        return res.status(400).json({ success: false, message: "email cannot be empty." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "preferredCategories")) {
      updates.preferredCategories = Array.isArray(updates.preferredCategories)
        ? updates.preferredCategories
        : [];
    }

    const partner = await Partner.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found." });
    }

    return res.json({
      success: true,
      message: "Partner updated successfully.",
      data: {
        partner: formatPartner(partner),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update partner.",
      error: error.message,
    });
  }
}

async function deletePartner(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid partner ID." });
    }

    const deleted = await Partner.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Partner not found." });
    }

    return res.json({
      success: true,
      message: "Partner deleted successfully.",
      data: { id },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete partner.",
      error: error.message,
    });
  }
}

module.exports = {
  listPartners,
  createPartner,
  getPartnerById,
  updatePartner,
  deletePartner,
};