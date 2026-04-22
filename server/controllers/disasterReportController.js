const DisasterReport = require("../models/DisasterReport");
const mongoose = require("mongoose");

const ALLOWED_STATUSES = ["draft", "active", "pending_inventory", "allocated", "monitoring", "resolved"];
const MIN_AFFECTED_POPULATION = 1;
const MAX_AFFECTED_POPULATION = 10000000;
const UPDATABLE_FIELDS = [
  "disasterType",
  "location",
  "severity",
  "affectedPopulation",
  "eventDate",
  "priority",
  "description",
  "immediateNeeds",
  "status",
  "reportedBy",
  "allocatedResources",
];

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function toIsoDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseAffectedPopulation(value) {
  const population = Number(value);

  if (
    !Number.isInteger(population) ||
    population < MIN_AFFECTED_POPULATION ||
    population > MAX_AFFECTED_POPULATION
  ) {
    return null;
  }

  return population;
}

function normalizeAllocatedResources(value) {
  if (value === null) {
    return null;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("allocatedResources must be an object or null.");
  }

  const rawQuantities =
    value.quantities && typeof value.quantities === "object" && !Array.isArray(value.quantities)
      ? value.quantities
      : {};

  const quantities = {};
  Object.entries(rawQuantities).forEach(([key, qty]) => {
    const parsedQty = Number(qty);
    if (!Number.isFinite(parsedQty) || parsedQty < 0) {
      throw new Error("allocatedResources quantities must be non-negative numbers.");
    }
    quantities[key] = parsedQty;
  });

  const rawLineItems = Array.isArray(value.lineItems) ? value.lineItems : [];
  const lineItems = rawLineItems.map((item) => {
    const quantity = Number(item.quantity);
    const itemId = String(item.itemId || "").trim();
    const itemName = String(item.itemName || "").trim();

    if (!itemId || !itemName || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("allocatedResources lineItems contain invalid data.");
    }

    return {
      itemId,
      itemName,
      quantity,
      category: String(item.category || "").trim(),
    };
  });

  const allocatedDate = value.allocatedDate ? toIsoDateOrNull(value.allocatedDate) : new Date();
  if (value.allocatedDate && !allocatedDate) {
    throw new Error("allocatedResources allocatedDate is invalid.");
  }

  const lastUpdated = value.lastUpdated ? toIsoDateOrNull(value.lastUpdated) : new Date();
  if (value.lastUpdated && !lastUpdated) {
    throw new Error("allocatedResources lastUpdated is invalid.");
  }

  return {
    quantities,
    lineItems,
    message: String(value.message || "").trim(),
    allocatedDate,
    allocatedBy: String(value.allocatedBy || "Allocation Officer").trim(),
    lastUpdated,
  };
}

function formatAllocatedResources(allocatedResources) {
  if (!allocatedResources) {
    return null;
  }

  const quantities = allocatedResources.quantities;
  const normalizedQuantities =
    quantities instanceof Map
      ? Object.fromEntries(quantities.entries())
      : quantities && typeof quantities === "object"
        ? quantities
        : {};

  return {
    quantities: normalizedQuantities,
    lineItems: Array.isArray(allocatedResources.lineItems)
      ? allocatedResources.lineItems.map((item) => ({
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
          category: item.category,
        }))
      : [],
    message: allocatedResources.message || "",
    allocatedDate: allocatedResources.allocatedDate || null,
    allocatedBy: allocatedResources.allocatedBy || "",
    lastUpdated: allocatedResources.lastUpdated || null,
  };
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
    status: report.status,
    reportedBy: report.reportedBy,
    allocatedResources: formatAllocatedResources(report.allocatedResources),
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
      status,
      reportedBy,
    } = req.body;

    if (!disasterType || !location || !eventDate) {
      return res.status(400).json({ message: "disasterType, location, and eventDate are required." });
    }

    const parsedPopulation = parseAffectedPopulation(affectedPopulation);
    if (parsedPopulation === null) {
      return res.status(400).json({
        message: `affectedPopulation must be a whole number between ${MIN_AFFECTED_POPULATION} and ${MAX_AFFECTED_POPULATION}.`,
      });
    }

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const createdBy = req.user?.id;
    if (!createdBy || !mongoose.Types.ObjectId.isValid(createdBy)) {
      return res.status(401).json({ message: "Invalid user session. Please sign in again." });
    }

    const report = await DisasterReport.create({
      disasterType,
      location,
      severityLevel: severity,
      severity,
      affectedPeople: parsedPopulation,
      affectedPopulation: parsedPopulation,
      eventDate,
      priority,
      description,
      immediateNeeds,
      status,
      reportedBy,
      createdBy,
    });

    return res.status(201).json(formatReport(report));
  } catch (error) {
    if (error?.name === "ValidationError") {
      const validationMessage = Object.values(error.errors || {})
        .map((entry) => entry?.message)
        .filter(Boolean)
        .join(" ");

      return res.status(400).json({
        message: validationMessage || "Invalid disaster report data.",
      });
    }

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
      const population = parseAffectedPopulation(updates.affectedPopulation);
      if (population === null) {
        return res.status(400).json({
          message: `affectedPopulation must be a whole number between ${MIN_AFFECTED_POPULATION} and ${MAX_AFFECTED_POPULATION}.`,
        });
      }
      updates.affectedPopulation = population;
      updates.affectedPeople = population;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "severity")) {
      updates.severityLevel = updates.severity;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "immediateNeeds")) {
      if (!Array.isArray(updates.immediateNeeds)) {
        return res.status(400).json({ message: "immediateNeeds must be an array." });
      }
      updates.immediateNeeds = updates.immediateNeeds
        .map((item) => String(item).trim())
        .filter(Boolean);
    }

    if (Object.prototype.hasOwnProperty.call(updates, "allocatedResources")) {
      try {
        updates.allocatedResources = normalizeAllocatedResources(updates.allocatedResources);
      } catch (error) {
        return res.status(400).json({ message: error.message || "Invalid allocatedResources value." });
      }
    }

    const report = await DisasterReport.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!report) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

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

async function allocateResources(req, res) {
  try {
    const { id } = req.params;
    const { allocatedResources, allocatedBy, message } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    if (!allocatedResources) {
      return res.status(400).json({ message: "allocatedResources is required." });
    }

    // Normalize and validate allocation data
    let normalizedResources;
    try {
      normalizedResources = normalizeAllocatedResources({
        ...allocatedResources,
        allocatedBy: allocatedBy || "Allocation Officer",
        message: message || "",
        allocatedDate: new Date(),
        lastUpdated: new Date(),
      });
    } catch (error) {
      return res.status(400).json({ message: error.message || "Invalid allocatedResources value." });
    }

    // Update the disaster report with allocated resources
    const report = await DisasterReport.findByIdAndUpdate(
      id,
      {
        allocatedResources: normalizedResources,
        status: "allocated",
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!report) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    return res.json({
      message: "Resources allocated successfully.",
      report: formatReport(report),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to allocate resources.", error: error.message });
  }
}

async function updateAllocation(req, res) {
  try {
    const { id } = req.params;
    const { allocatedResources, allocatedBy, message } = req.body;

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

    if (!report.allocatedResources) {
      return res.status(400).json({ message: "No resources allocated to this report yet." });
    }

    // Normalize and validate allocation data
    let normalizedResources;
    try {
      normalizedResources = normalizeAllocatedResources({
        ...allocatedResources,
        allocatedBy: allocatedBy || report.allocatedResources.allocatedBy,
        message: message || report.allocatedResources.message,
        allocatedDate: report.allocatedResources.allocatedDate,
        lastUpdated: new Date(),
      });
    } catch (error) {
      return res.status(400).json({ message: error.message || "Invalid allocatedResources value." });
    }

    // Update the allocated resources
    const updatedReport = await DisasterReport.findByIdAndUpdate(
      id,
      {
        allocatedResources: normalizedResources,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.json({
      message: "Allocation updated successfully.",
      report: formatReport(updatedReport),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update allocation.", error: error.message });
  }
}

async function deallocateResources(req, res) {
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

    const report = await DisasterReport.findByIdAndUpdate(
      id,
      {
        allocatedResources: null,
        status: "pending_inventory",
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!report) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    return res.json({
      message: "Resources deallocated successfully.",
      report: formatReport(report),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to deallocate resources.", error: error.message });
  }
}

module.exports = {
  createDisasterReport,
  listDisasterReports,
  getDisasterReportById,
  updateDisasterReport,
  deleteDisasterReport,
  allocateResources,
  updateAllocation,
  deallocateResources,
};
