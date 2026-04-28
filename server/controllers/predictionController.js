const { getPrediction } = require("../services/predictionService");
const mongoose = require("mongoose");
const PredictionLog = require("../models/PredictionLog");
const { ITEM_CATEGORIES } = require("../utils/constants");

const predictResources = async (req, res) => {
  try {
    const { disasterType, severity, affectedPopulation, disasterId, location } = req.body;

    if (!disasterType || !severity || affectedPopulation === undefined) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const numericPopulation = Number(affectedPopulation);
    if (!Number.isFinite(numericPopulation) || numericPopulation < 0) {
      return res.status(400).json({ message: "affectedPopulation must be a non-negative number." });
    }

    const normalizedSeverity = ["low", "medium", "high", "critical"].includes(
      String(severity || "").toLowerCase()
    )
      ? String(severity).toLowerCase()
      : "medium";

    const result = await getPrediction({
      disasterType,
      severity: normalizedSeverity,
      affectedPopulation: numericPopulation,
    });

    if (disasterId && mongoose.Types.ObjectId.isValid(disasterId)) {
      const predictedResources = [
        {
          itemName: "Food",
          category: ITEM_CATEGORIES.FOOD,
          recommendedQuantity: Number(result.foodNeeded || 0),
          unit: "units",
        },
        {
          itemName: "Water",
          category: ITEM_CATEGORIES.WATER,
          recommendedQuantity: Number(result.waterNeeded || 0),
          unit: "units",
        },
        {
          itemName: "Medicine",
          category: ITEM_CATEGORIES.MEDICAL,
          recommendedQuantity: Number(result.medicineNeeded || 0),
          unit: "units",
        },
      ];

      await PredictionLog.create({
        disasterId,
        inputFactors: {
          disasterType: String(disasterType).trim(),
          location: String(location || "Unknown").trim() || "Unknown",
          severityLevel: normalizedSeverity,
          affectedPeople: numericPopulation,
        },
        predictedResources,
        generatedBy: req.user?.id || null,
      });
    }

    // Include category mapping in response for frontend consistency
    const categorizedResult = {
      ...result,
      predictedResources: [
        {
          itemName: "Food",
          category: ITEM_CATEGORIES.FOOD,
          quantity: Number(result.foodNeeded || 0),
        },
        {
          itemName: "Water", 
          category: ITEM_CATEGORIES.WATER,
          quantity: Number(result.waterNeeded || 0),
        },
        {
          itemName: "Medicine",
          category: ITEM_CATEGORIES.MEDICAL,
          quantity: Number(result.medicineNeeded || 0),
        },
      ],
    };

    res.status(200).json(categorizedResult);
  } catch (error) {
    console.error("Prediction controller error:", error.message);
    res.status(500).json({ message: "Failed to get prediction." });
  }
};

const getPredictionLogs = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const logs = await PredictionLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("generatedBy", "fullName email role")
      .populate("disasterId", "disasterType location priority status eventDate");

    const formattedLogs = logs.map((log) => ({
      id: log._id.toString(),
      disasterId: log.disasterId?._id?.toString() || null,
      disasterType: log.inputFactors?.disasterType || log.disasterId?.disasterType || "-",
      location: log.inputFactors?.location || log.disasterId?.location || "-",
      severity: log.inputFactors?.severityLevel || "-",
      affectedPeople: Number(log.inputFactors?.affectedPeople || 0),
      predictedResources: Array.isArray(log.predictedResources) ? log.predictedResources : [],
      generatedBy: log.generatedBy
        ? {
            id: log.generatedBy._id?.toString?.() || null,
            fullName: log.generatedBy.fullName || "-",
            email: log.generatedBy.email || "-",
            role: log.generatedBy.role || "-",
          }
        : null,
      createdAt: log.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: formattedLogs.length,
      data: formattedLogs,
    });
  } catch (error) {
    console.error("Prediction logs error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch prediction logs." });
  }
};

module.exports = { predictResources, getPredictionLogs };