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
  "status",
  "reportedBy",
];

function isDbConnected() {
  return mongoose.connection.readyState === 1;
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

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const report = await DisasterReport.create({
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
      updates.immediateNeeds = updates.immediateNeeds
        .map((item) => String(item).trim())
        .filter(Boolean);
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

module.exports = {
  createDisasterReport,
  listDisasterReports,
  getDisasterReportById,
  updateDisasterReport,
  deleteDisasterReport,
};
