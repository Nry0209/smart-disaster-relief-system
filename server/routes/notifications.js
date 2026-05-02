const express = require("express");
const AuditLog = require("../models/AuditLog");
const { authenticateToken } = require("../config/auth");

const router = express.Router();

function toNotification(entry) {
  const label = `${entry.module}: ${entry.action}`;
  return {
    id: String(entry._id),
    title: entry.description || label,
    module: entry.module,
    action: entry.action,
    timestamp: entry.createdAt,
  };
}

router.get("/", authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 30);

    const entries = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("module action description createdAt")
      .lean();

    const notifications = entries.map(toNotification);

    return res.json({
      success: true,
      data: {
        notifications,
        count: notifications.length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
});

module.exports = router;
