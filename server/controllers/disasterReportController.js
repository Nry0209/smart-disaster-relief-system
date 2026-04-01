const DisasterReport = require("../models/DisasterReport");
const mongoose = require("mongoose");

const inMemoryReports = [];
const ALLOWED_STATUSES = ["draft", "active", "pending_inventory", "monitoring", "resolved"];

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function makeMemoryReport(payload) {
  const now = new Date();
  return {
    id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    disasterType: payload.disasterType,
    location: payload.location,
    severity: payload.severity,
    affectedPopulation: payload.affectedPopulation,
    eventDate: payload.eventDate,
    priority: payload.priority,
    description: payload.description,
    immediateNeeds: payload.immediateNeeds || [],
    status: payload.status || "active",
    reportedBy: payload.reportedBy || "DMC Officer",
    createdAt: now,
    updatedAt: now,
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
      const report = makeMemoryReport({
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
      inMemoryReports.unshift(report);
      return res.status(201).json(report);
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
      let reports = [...inMemoryReports];

      if (status) {
        reports = reports.filter((item) => item.status === status);
      }

      if (priority) {
        reports = reports.filter((item) => item.priority === priority);
      }

      if (search) {
        const query = search.toLowerCase();
        reports = reports.filter(
          (item) =>
            item.location?.toLowerCase().includes(query) ||
            item.disasterType?.toLowerCase().includes(query) ||
            item.reportedBy?.toLowerCase().includes(query)
        );
      }

      return res.json(reports);
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

module.exports = {
  createDisasterReport,
  listDisasterReports,
};
