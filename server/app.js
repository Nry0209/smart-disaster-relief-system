const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const disasterReportRoutes = require("./routes/disasterReportRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/disaster-reports", disasterReportRoutes);

app.get("/", (req, res) => {
  res.send("Smart Disaster Relief API is running...");
});

module.exports = app;