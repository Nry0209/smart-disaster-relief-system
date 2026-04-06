const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const disasterReportRoutes = require("./routes/disasterReportRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const allocationRoutes = require("./routes/allocationRoutes");

dotenv.config({ override: true });

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/disaster-reports", disasterReportRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/allocations", allocationRoutes);

app.get("/", (req, res) => {
  res.send("Smart Disaster Relief API is running...");
});

module.exports = app;