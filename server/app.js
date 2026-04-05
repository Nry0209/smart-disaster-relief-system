const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Import and connect to MongoDB
const { connectDB } = require('./models');

// Connect to MongoDB on startup
connectDB();

// Import routes
const inventoryRoutes = require('./routes/inventory');
const donationRoutes = require('./routes/donationsMongo');
const resourceRequestRoutes = require('./routes/resourceRequestsMongo');

// Use routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/resource-requests', resourceRequestRoutes);

app.get("/", (req, res) => {
  res.send("Smart Disaster Relief API is running with MongoDB...");
});

module.exports = app;