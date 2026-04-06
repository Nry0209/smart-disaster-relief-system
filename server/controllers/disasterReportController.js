const DisasterReport = require("../models/DisasterReport");
const mongoose = require("mongoose");

const ALLOWED_STATUSES = ["draft", "active", "pending_inventory", "monitoring", "resolved"];
const UPDATABLE_FIELDS = [
  "disasterType",
  "location",
  "severity",
  "affectedPopulation",
  "eventDate",
  "priority",
  "description",
  "immediateNeeds",
  "resourceRequirements",
  "status",
  "reportedBy",
  "contactPhone",
  "contactEmail",
];

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function sanitizeNeeds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

function sanitizeResourceRequirements(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();

  return value
    .map((item) => {
      const name = String(item?.name || "").trim();
      const quantity = Number(item?.quantity);

      if (!name || seen.has(name)) {
        return null;
      }

      seen.add(name);

      return {
        name,
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
      };
    })
    .filter(Boolean);
}

function syncNeedsAndRequirements(needs, requirements) {
  const requirementMap = new Map(
    requirements.map((item) => [item.name, Number(item.quantity) > 0 ? Number(item.quantity) : 1])
  );
  const mergedNeeds = [...new Set([...needs, ...requirementMap.keys()])];

  return {
    immediateNeeds: mergedNeeds,
    resourceRequirements: mergedNeeds.map((name) => ({
      name,
      quantity: requirementMap.has(name) ? requirementMap.get(name) : 1,
    })),
  };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return /^[0-9+()\-\s]{7,20}$/.test(value);
}

function formatReport(report) {
  return {
    id: report._id.toString(),
    disasterType: report.disasterType,
    location: report.location,
    severity: report.severity,
    affectedPopulation: report.affectedPopulation,
    eventDate: report.eventDate,
    priority: report.priority,
    description: report.description,
    immediateNeeds: report.immediateNeeds,
    resourceRequirements: report.resourceRequirements,
    status: report.status,
    reportedBy: report.reportedBy,
    contactPhone: report.contactPhone,
    contactEmail: report.contactEmail,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

async function createDisasterReport(req, res) {
  try {
    const {
      disasterType,
      location,
      severity,
      affectedPopulation,
      eventDate,
      priority,
      description,
      immediateNeeds,
      resourceRequirements,
      status,
      reportedBy,
      contactPhone,
      contactEmail,
    } = req.body;

    if (!disasterType || !location || !eventDate) {
      return res.status(400).json({ message: "disasterType, location, and eventDate are required." });
    }

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    if (immediateNeeds !== undefined && !Array.isArray(immediateNeeds)) {
      return res.status(400).json({ message: "immediateNeeds must be an array." });
    }

    if (resourceRequirements !== undefined && !Array.isArray(resourceRequirements)) {
      return res.status(400).json({ message: "resourceRequirements must be an array." });
    }

    const normalizedReporter = String(reportedBy || "").trim();
    const normalizedPhone = String(contactPhone || "").trim();
    const normalizedEmail = String(contactEmail || "")
      .trim()
      .toLowerCase();

    if (!normalizedReporter) {
      return res.status(400).json({ message: "reportedBy is required." });
    }

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      return res.status(400).json({ message: "A valid contactPhone is required." });
    }

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "A valid contactEmail is required." });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const syncedNeedsAndRequirements = syncNeedsAndRequirements(
      sanitizeNeeds(immediateNeeds),
      sanitizeResourceRequirements(resourceRequirements)
    );

    const report = await DisasterReport.create({
      disasterType,
      location,
      severity,
      affectedPopulation,
      eventDate,
      priority,
      description,
      immediateNeeds: syncedNeedsAndRequirements.immediateNeeds,
      resourceRequirements: syncedNeedsAndRequirements.resourceRequirements,
      status,
      reportedBy: normalizedReporter,
      contactPhone: normalizedPhone,
      contactEmail: normalizedEmail,
    });

    return res.status(201).json(formatReport(report));
  } catch (error) {
    return res.status(500).json({ message: "Failed to create disaster report.", error: error.message });
  }
}

async function listDisasterReports(req, res) {
  try {
    const { status, priority, search } = req.query;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (search) {
      filter.$or = [
        { location: { $regex: search, $options: "i" } },
        { disasterType: { $regex: search, $options: "i" } },
        { reportedBy: { $regex: search, $options: "i" } },
        { contactPhone: { $regex: search, $options: "i" } },
        { contactEmail: { $regex: search, $options: "i" } },
      ];
    }

    const reports = await DisasterReport.find(filter).sort({ createdAt: -1 });
    return res.json(reports.map(formatReport));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch disaster reports.", error: error.message });
  }
}

async function getDisasterReportById(req, res) {
  try {
    const { id } = req.params;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    const report = await DisasterReport.findById(id);

    if (!report) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    return res.json(formatReport(report));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch disaster report.", error: error.message });
  }
}

async function updateDisasterReport(req, res) {
  try {
    const { id } = req.params;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    const updates = {};

    UPDATABLE_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "No valid fields provided for update." });
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, "status") &&
      !ALLOWED_STATUSES.includes(updates.status)
    ) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    if (Object.prototype.hasOwnProperty.call(updates, "affectedPopulation")) {
      const population = Number(updates.affectedPopulation);
      if (!Number.isFinite(population) || population <= 0) {
        return res.status(400).json({ message: "affectedPopulation must be greater than 0." });
      }
      updates.affectedPopulation = population;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "immediateNeeds")) {
      if (!Array.isArray(updates.immediateNeeds)) {
        return res.status(400).json({ message: "immediateNeeds must be an array." });
      }
      updates.immediateNeeds = sanitizeNeeds(updates.immediateNeeds);
    }

    if (Object.prototype.hasOwnProperty.call(updates, "resourceRequirements")) {
      if (!Array.isArray(updates.resourceRequirements)) {
        return res.status(400).json({ message: "resourceRequirements must be an array." });
      }
      updates.resourceRequirements = sanitizeResourceRequirements(updates.resourceRequirements);
    }

    if (Object.prototype.hasOwnProperty.call(updates, "reportedBy")) {
      updates.reportedBy = String(updates.reportedBy || "").trim();
      if (!updates.reportedBy) {
        return res.status(400).json({ message: "reportedBy cannot be empty." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "contactPhone")) {
      updates.contactPhone = String(updates.contactPhone || "").trim();
      if (!updates.contactPhone || !isValidPhone(updates.contactPhone)) {
        return res.status(400).json({ message: "A valid contactPhone is required." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "contactEmail")) {
      updates.contactEmail = String(updates.contactEmail || "")
        .trim()
        .toLowerCase();
      if (!updates.contactEmail || !isValidEmail(updates.contactEmail)) {
        return res.status(400).json({ message: "A valid contactEmail is required." });
      }
    }

    const report = await DisasterReport.findById(id);

    if (!report) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, "immediateNeeds") ||
      Object.prototype.hasOwnProperty.call(updates, "resourceRequirements")
    ) {
      const syncedNeedsAndRequirements = syncNeedsAndRequirements(
        Object.prototype.hasOwnProperty.call(updates, "immediateNeeds")
          ? updates.immediateNeeds
          : sanitizeNeeds(report.immediateNeeds),
        Object.prototype.hasOwnProperty.call(updates, "resourceRequirements")
          ? updates.resourceRequirements
          : sanitizeResourceRequirements(report.resourceRequirements)
      );

      updates.immediateNeeds = syncedNeedsAndRequirements.immediateNeeds;
      updates.resourceRequirements = syncedNeedsAndRequirements.resourceRequirements;
    }

    Object.assign(report, updates);
    await report.save();

    return res.json(formatReport(report));
  } catch (error) {
    return res.status(500).json({ message: "Failed to update disaster report.", error: error.message });
  }
}

async function deleteDisasterReport(req, res) {
  try {
    const { id } = req.params;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    const report = await DisasterReport.findByIdAndDelete(id);

    if (!report) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    return res.json({ message: "Disaster report deleted successfully.", id });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete disaster report.", error: error.message });
  }
}

module.exports = {
  createDisasterReport,
  listDisasterReports,
  getDisasterReportById,
  updateDisasterReport,
  deleteDisasterReport,
};
