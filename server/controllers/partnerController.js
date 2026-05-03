const mongoose = require("mongoose");
const path = require("path");
const crypto = require("crypto");
const Partner = require("../models/Partner");
const User = require("../models/User");
const { sendStaffOnboardingEmail } = require("../services/emailService");

const DOCUMENT_FIELDS = [
  "organizationProfileDocument",
  "registrationCertificate",
  "verificationDocument",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^0\d{9}$/;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MIN_ADDRESS_LENGTH = 10;
const MAX_ADDRESS_LENGTH = 200;

function validatePartnerPayload(payload) {
  const errors = [];
  const organizationName = String(payload.organizationName || "").trim();
  const contactPerson = String(payload.contactPerson || "").trim();
  const email = String(payload.email || "").trim();
  const phone = String(payload.phone || "").trim().replace(/\s+/g, "");
  const address = String(payload.address || "").trim();

  if (!organizationName || organizationName.length < MIN_NAME_LENGTH || organizationName.length > MAX_NAME_LENGTH) {
    errors.push({ field: "organizationName", message: `Organization name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.` });
  }

  if (!contactPerson || contactPerson.length < MIN_NAME_LENGTH || contactPerson.length > MAX_NAME_LENGTH) {
    errors.push({ field: "contactPerson", message: `Contact person must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.` });
  }

  if (!email || !EMAIL_PATTERN.test(email)) {
    errors.push({ field: "email", message: "Enter a valid email address." });
  }

  if (!phone || !PHONE_PATTERN.test(phone)) {
    errors.push({ field: "phone", message: "Phone number must start with 0 and contain exactly 10 digits." });
  }

  if (!address || address.length < MIN_ADDRESS_LENGTH || address.length > MAX_ADDRESS_LENGTH) {
    errors.push({ field: "address", message: `Address must be between ${MIN_ADDRESS_LENGTH} and ${MAX_ADDRESS_LENGTH} characters.` });
  }

  return errors;
}

function parsePreferredCategories(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
      }
    } catch (error) {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function toPublicUploadPath(filePath) {
  if (!filePath) {
    return "";
  }

  const relativePath = path.relative(path.join(__dirname, ".."), filePath).split(path.sep).join("/");
  return `/${relativePath}`;
}

function resolveDocumentValue(req, fieldName, existingValue = "") {
  const uploadedFile = req.files?.[fieldName]?.[0];
  if (uploadedFile) {
    return toPublicUploadPath(uploadedFile.path);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, fieldName)) {
    return String(req.body[fieldName] || "").trim();
  }

  return existingValue;
}

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

async function resolveOwnPartnerForUser(user) {
  const userId = String(user?.id || "").trim();
  const normalizedEmail = String(user?.email || "").trim().toLowerCase();
  const dbUser =
    userId && mongoose.Types.ObjectId.isValid(userId)
      ? await User.findById(userId).select("fullName email").lean()
      : null;
  const fullName = String(user?.fullName || user?.name || dbUser?.fullName || "").trim();
  const lookupEmail = String(normalizedEmail || dbUser?.email || "").trim().toLowerCase();

  async function linkPartner(partner) {
    if (partner && userId && mongoose.Types.ObjectId.isValid(userId) && !partner.userId) {
      partner.userId = userId;
      await partner.save();
    }

    return partner;
  }

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const partnerByUserId = await Partner.findOne({ userId });
    if (partnerByUserId) {
      return partnerByUserId;
    }
  }

  if (lookupEmail) {
    const partnerByEmail = await Partner.findOne({ email: lookupEmail });
    if (partnerByEmail) {
      return linkPartner(partnerByEmail);
    }
  }

  if (fullName) {
    const escapedName = fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const partnerByName = await Partner.findOne({
      $or: [
        { contactPerson: { $regex: `^${escapedName}$`, $options: "i" } },
        { organizationName: { $regex: `^${escapedName}$`, $options: "i" } },
      ],
    });

    if (partnerByName) {
      return linkPartner(partnerByName);
    }
  }

  return null;
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

    if (req.user?.role === "ngo_partner") {
      const partner = await resolveOwnPartnerForUser(req.user);

      return res.json({
        success: true,
        data: {
          partners: partner ? [formatPartner(partner)] : [],
        },
      });
    }

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
    } = req.body;

    const resolvedDocuments = DOCUMENT_FIELDS.reduce((accumulator, fieldName) => {
      accumulator[fieldName] = resolveDocumentValue(req, fieldName);
      return accumulator;
    }, {});

    const validationErrors = validatePartnerPayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validationErrors,
      });
    }

    const missingDocumentErrors = DOCUMENT_FIELDS
      .filter((fieldName) => !resolvedDocuments[fieldName])
      .map((fieldName) => ({
        field: fieldName,
        message: `${fieldName} is required and must be uploaded as a PDF.`,
      }));

    if (missingDocumentErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: missingDocumentErrors,
      });
    }

    const existingPartner = await Partner.findOne({ email: String(email).toLowerCase() });
    if (existingPartner) {
      return res.status(400).json({
        success: false,
        message: "Partner with this email already exists.",
      });
    }

    let partnerUser = await User.findOne({ email: String(email).toLowerCase().trim() });
    let onboardingDetails = null;

    if (partnerUser) {
      if (partnerUser.role !== "ngo_partner") {
        return res.status(400).json({
          success: false,
          message: "A user with this email already exists with a non-NGO role.",
        });
      }

      if (partnerUser.isFirstLogin) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000);
        const setupToken = crypto.randomBytes(32).toString("hex");
        const resetPasswordToken = crypto.createHash("sha256").update(setupToken).digest("hex");
        const resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        partnerUser.otp = otp;
        partnerUser.otpExpires = otpExpires;
        partnerUser.resetPasswordToken = resetPasswordToken;
        partnerUser.resetPasswordExpires = resetPasswordExpires;
        await partnerUser.save();

        onboardingDetails = {
          otp,
          setupToken,
        };
      }
    } else {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 15 * 60 * 1000);
      const setupToken = crypto.randomBytes(32).toString("hex");
      const resetPasswordToken = crypto.createHash("sha256").update(setupToken).digest("hex");
      const resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tempPassword = crypto.randomBytes(16).toString("hex");

      partnerUser = await User.create({
        fullName: String(contactPerson || organizationName || "NGO Partner").trim(),
        email: String(email).toLowerCase().trim(),
        password: tempPassword,
        role: "ngo_partner",
        status: "active",
        phone: String(phone || "").trim(),
        department: "NGO Partner",
        createdBy: req.user?.id || null,
        isFirstLogin: true,
        otp,
        otpExpires,
        resetPasswordToken,
        resetPasswordExpires,
      });

      onboardingDetails = {
        otp,
        setupToken,
      };
    }

    const partner = await Partner.create({
      organizationName: String(organizationName).trim(),
      contactPerson: String(contactPerson || "").trim(),
      email: String(email).toLowerCase().trim(),
      phone: String(phone || "").trim(),
      address: String(address || "").trim(),
      registrationNumber: String(registrationNumber || "").trim(),
      preferredCategories: parsePreferredCategories(preferredCategories),
      status: status || "active",
      organizationProfileDocument: resolvedDocuments.organizationProfileDocument,
      registrationCertificate: resolvedDocuments.registrationCertificate,
      verificationDocument: resolvedDocuments.verificationDocument,
      userId: partnerUser?._id,
      createdBy: req.user?.id || null,
    });

    let emailSent = false;
    if (onboardingDetails) {
      emailSent = await sendStaffOnboardingEmail(
        String(email).toLowerCase().trim(),
        onboardingDetails.otp,
        String(contactPerson || organizationName || "NGO Partner").trim(),
        onboardingDetails.setupToken
      );
    }

    const setupLink = onboardingDetails
      ? `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${onboardingDetails.setupToken}`
      : undefined;

    return res.status(201).json({
      success: true,
      message: onboardingDetails
        ? "Partner created successfully. OTP and password setup link have been sent to the partner email."
        : "Partner created successfully.",
      data: {
        partner: formatPartner(partner),
        user: partnerUser
          ? {
              id: partnerUser._id,
              email: partnerUser.email,
              role: partnerUser.role,
              isFirstLogin: partnerUser.isFirstLogin,
            }
          : null,
        emailSent,
        otp:
          onboardingDetails && (process.env.NODE_ENV === "development" || !emailSent)
            ? onboardingDetails.otp
            : undefined,
        setupLink:
          onboardingDetails && (process.env.NODE_ENV === "development" || !emailSent)
            ? setupLink
            : undefined,
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

    const existingPartner = await Partner.findById(id);
    if (!existingPartner) {
      return res.status(404).json({ success: false, message: "Partner not found." });
    }

    DOCUMENT_FIELDS.forEach((fieldName) => {
      const resolvedValue = resolveDocumentValue(req, fieldName, existingPartner[fieldName] || "");
      if (resolvedValue !== existingPartner[fieldName]) {
        updates[fieldName] = resolvedValue;
      }
    });

    const validationErrors = validatePartnerPayload({
      organizationName: Object.prototype.hasOwnProperty.call(updates, "organizationName")
        ? updates.organizationName
        : existingPartner.organizationName,
      contactPerson: Object.prototype.hasOwnProperty.call(updates, "contactPerson")
        ? updates.contactPerson
        : existingPartner.contactPerson,
      email: Object.prototype.hasOwnProperty.call(updates, "email")
        ? updates.email
        : existingPartner.email,
      phone: Object.prototype.hasOwnProperty.call(updates, "phone")
        ? updates.phone
        : existingPartner.phone,
      address: Object.prototype.hasOwnProperty.call(updates, "address")
        ? updates.address
        : existingPartner.address,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validationErrors,
      });
    }

    if (Object.prototype.hasOwnProperty.call(updates, "email")) {
      updates.email = String(updates.email || "").trim().toLowerCase();
      if (!updates.email) {
        return res.status(400).json({ success: false, message: "email cannot be empty." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "preferredCategories")) {
      updates.preferredCategories = parsePreferredCategories(updates.preferredCategories);
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
