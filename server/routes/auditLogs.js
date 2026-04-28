const express = require("express");
const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");
const { authenticateToken, adminOnly } = require("../config/auth");

const router = express.Router();

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function safeParseDescription(description) {
  if (!description) {
    return null;
  }

  try {
    const parsed = JSON.parse(description);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function deriveStatus(action, meta) {
  const statusCode = Number(meta?.statusCode);

  if (action === "SUSPICIOUS_REQUEST") {
    return "failure";
  }

  if (Number.isFinite(statusCode) && statusCode >= 400) {
    return "failure";
  }

  return "success";
}

function deriveSeverity(action, meta) {
  if (action === "SUSPICIOUS_REQUEST") {
    return "high";
  }

  if (action === "PERFORMANCE") {
    return Number(meta?.duration || 0) > 1000 ? "medium" : "low";
  }

  if (action === "DELETE" || action === "LOGIN_FAILED") {
    return "high";
  }

  if (action === "CREATE" || action === "UPDATE" || action === "PERMISSION_UPDATE") {
    return "medium";
  }

  return "low";
}

function formatAuditLog(entry) {
  const meta = safeParseDescription(entry.description) || {};
  const user = entry.userId || {};
  const details = meta.details || {};
  const action = String(entry.action || meta.action || "UNKNOWN");
  const moduleName = String(entry.module || meta.module || "system");
  const resource = meta.resource || moduleName;
  const userName = user.fullName || meta.userEmail || "System";
  const userRole = user.role || meta.userRole || "system";
  const ipAddress = meta.ipAddress || details.ipAddress || "-";
  const userAgent = meta.userAgent || details.userAgent || "-";
  const status = deriveStatus(action, meta);
  const severity = deriveSeverity(action, meta);

  return {
    id: String(entry._id),
    timestamp: entry.createdAt,
    user: String(user._id || entry.userId || ""),
    userName,
    userRole,
    action,
    resource,
    details: meta.method
      ? `${meta.method} ${meta.url || ""}`.trim()
      : String(entry.description || "").slice(0, 120) || "Activity recorded",
    ipAddress,
    userAgent,
    status,
    severity,
    category: moduleName,
    resourceId: meta.referenceId || null,
    quantity: meta.quantity || null,
    location: meta.location || null,
    rawDescription: entry.description || "",
  };
}

router.get("/", authenticateToken, adminOnly, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
    const action = String(req.query.action || "").trim();
    const moduleName = String(req.query.module || "").trim();
    const search = String(req.query.search || "").trim().toLowerCase();

    const filter = {};

    if (action) {
      filter.action = action;
    }

    if (moduleName) {
      filter.module = moduleName;
    }

    const logs = await AuditLog.find(filter)
      .populate("userId", "fullName email role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const auditLogs = logs
      .map(formatAuditLog)
      .filter((entry) => {
        if (!search) {
          return true;
        }

        const haystack = [
          entry.userName,
          entry.userRole,
          entry.action,
          entry.resource,
          entry.details,
          entry.category,
          entry.ipAddress,
          entry.userAgent,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      });

    return res.json({
      success: true,
      data: {
        auditLogs,
        count: auditLogs.length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
    });
  }
});

module.exports = router;