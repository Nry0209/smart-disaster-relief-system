const mongoose = require("mongoose");
const Allocation = require("../models/Allocation");
const DisasterReport = require("../models/DisasterReport");

const REPORT_STATUSES = ["draft", "active", "pending_inventory", "allocated", "monitoring", "resolved"];

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function normalizeQuantities(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [name, quantity]) => {
    const normalizedName = String(name || "").trim();
    const normalizedQuantity = Number(quantity);

    if (!normalizedName || !Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
      return acc;
    }

    acc[normalizedName] = Math.round(normalizedQuantity);
    return acc;
  }, {});
}

function mapToObject(value) {
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

function formatAllocation(allocation) {
  return {
    id: allocation._id.toString(),
    disasterReportId: allocation.disasterReportId.toString(),
    quantities: mapToObject(allocation.quantities),
    message: allocation.message,
    allocatedBy: allocation.allocatedBy,
    allocatedDate: allocation.allocatedDate,
    lastUpdated: allocation.lastUpdated,
    createdAt: allocation.createdAt,
    updatedAt: allocation.updatedAt,
  };
}

function formatReportSummary(report) {
  return {
    id: report._id.toString(),
    status: report.status,
    allocatedResources: report.allocatedResources,
    updatedAt: report.updatedAt,
  };
}

async function listAllocations(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const filter = {};
    const { reportId } = req.query;

    if (reportId) {
      if (!mongoose.Types.ObjectId.isValid(reportId)) {
        return res.status(400).json({ message: "Invalid reportId query parameter." });
      }
      filter.disasterReportId = reportId;
    }

    const allocations = await Allocation.find(filter).sort({ updatedAt: -1 });
    return res.json(allocations.map(formatAllocation));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch allocations.", error: error.message });
  }
}

async function getAllocationByReport(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { reportId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    const allocation = await Allocation.findOne({ disasterReportId: reportId });
    if (!allocation) {
      return res.status(404).json({ message: "Allocation not found for this report." });
    }

    return res.json(formatAllocation(allocation));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch allocation.", error: error.message });
  }
}

async function upsertAllocationByReport(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { reportId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    const report = await DisasterReport.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    const quantities = normalizeQuantities(req.body.quantities);
    if (!Object.keys(quantities).length) {
      return res.status(400).json({ message: "At least one positive allocation quantity is required." });
    }

    const message = String(req.body.message || "").trim();
    const allocatedBy = String(req.body.allocatedBy || "Allocation Officer").trim() || "Allocation Officer";
    const status = String(req.body.status || "allocated").trim();

    if (!REPORT_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const existingAllocation = await Allocation.findOne({ disasterReportId: reportId });
    const now = new Date();

    const allocation = existingAllocation || new Allocation({ disasterReportId: reportId });
    allocation.quantities = quantities;
    allocation.message = message;
    allocation.allocatedBy = allocatedBy;
    allocation.allocatedDate = existingAllocation?.allocatedDate || now;
    allocation.lastUpdated = now;
    await allocation.save();

    report.status = status;
    report.allocatedResources = {
      quantities,
      message,
      allocatedBy,
      allocatedDate: allocation.allocatedDate,
      lastUpdated: now,
    };
    await report.save();

    return res.json({
      message: existingAllocation ? "Allocation updated successfully." : "Allocation created successfully.",
      allocation: formatAllocation(allocation),
      report: formatReportSummary(report),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save allocation.", error: error.message });
  }
}

async function clearAllocationByReport(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { reportId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    const report = await DisasterReport.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    const nextStatus = String(req.body?.status || "active").trim();
    if (!REPORT_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    await Allocation.findOneAndDelete({ disasterReportId: reportId });

    report.status = nextStatus;
    report.allocatedResources = null;
    await report.save();

    return res.json({
      message: "Allocation cleared successfully.",
      report: formatReportSummary(report),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to clear allocation.", error: error.message });
  }
}

module.exports = {
  listAllocations,
  getAllocationByReport,
  upsertAllocationByReport,
  clearAllocationByReport,
};
