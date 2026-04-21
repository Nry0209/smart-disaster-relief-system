const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");

dotenv.config({ override: true });

const app = express();

// Trust proxy for rate limiting and IP detection
app.set("trust proxy", 1);

// ================= MIDDLEWARE =================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors());
app.use(helmet());

// ================= ROUTES =================
// ✅ Make sure these file names EXACTLY match your /routes folder
const authRoutes = require("./routes/auth");
const disasterReportRoutes = require("./routes/disasterReportRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const allocationRoutes = require("./routes/allocations");
const trackingRoutes = require("./routes/tracking");
const dispatchRoutes = require("./routes/dispatch");
const donationRoutes = require("./routes/donations");
const partnerRoutes = require("./routes/partners");
const resourceRequestRoutes = require("./routes/resourceRequests");
const notificationRoutes = require("./routes/notifications");

// ================= API ROUTES =================
app.use("/api/auth", authRoutes);
app.use("/api/disaster-reports", disasterReportRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/dispatch", dispatchRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/resource-requests", resourceRequestRoutes);
app.use("/api/notifications", notificationRoutes);

// ================= HEALTH CHECK =================
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ================= API DOCS =================
app.get("/api/docs", (req, res) => {
  res.json({
    title: "Smart Disaster Relief API",
    version: "1.0.0",
    description: "API for managing disaster relief operations",
  });
});

// ================= ROOT =================
app.get("/", (req, res) => {
  res.json({
    message: "Smart Disaster Relief API is running...",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      disasterReports: "/api/disaster-reports",
      inventory: "/api/inventory",
      allocations: "/api/allocations",
      tracking: "/api/tracking",
      dispatch: "/api/dispatch",
      donations: "/api/donations",
      partners: "/api/partners",
      resourceRequests: "/api/resource-requests",
      notifications: "/api/notifications",
      health: "/health",
      docs: "/api/docs",
    },
  });
});

// ================= ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// ================= 404 HANDLER =================
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

module.exports = app;