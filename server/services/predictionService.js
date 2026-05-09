const axios = require("axios");

const PREDICTION_API_URL = process.env.PREDICTION_API_URL || "http://127.0.0.1:5001/predict";

function normalizeSeverity(value) {
  const severity = String(value || "medium").trim().toLowerCase();
  if (["low", "medium", "high", "critical"].includes(severity)) {
    return severity;
  }
  return "medium";
}

function estimateLocally({ disasterType, severity, affectedPopulation }) {
  const population = Math.max(0, Number(affectedPopulation) || 0);
  const normalizedSeverity = normalizeSeverity(severity);
  const type = String(disasterType || "").toLowerCase();

  const severityMultiplier = {
    low: 0.45,
    medium: 0.75,
    high: 1.1,
    critical: 1.45,
  }[normalizedSeverity];

  const disasterTypeMultiplier =
    type.includes("flood") ? 1.1 :
    type.includes("earthquake") ? 1.25 :
    type.includes("cyclone") ? 1.2 :
    type.includes("fire") ? 0.9 :
    1;

  const combined = severityMultiplier * disasterTypeMultiplier;

  const foodNeeded = Math.max(0, Math.round(population * 1.1 * combined));
  const waterNeeded = Math.max(0, Math.round(population * 2.4 * combined));
  const medicineNeeded = Math.max(0, Math.round(population * 0.25 * combined));

  // Calculate predicted allocated days: base coverage 1 day per 1000 people, scaled by severity
  const basePerThousand = 1;
  const allocatedDays = Math.max(1, Math.ceil((population / 1000) * basePerThousand * (severityMultiplier / 0.75)));

  return {
    foodNeeded,
    waterNeeded,
    medicineNeeded,
    allocatedDays,
    source: "rule-based-fallback",
  };
}

const getPrediction = async ({ disasterType, severity, affectedPopulation }) => {
  try {
    // Attempt ML service call (longer timeout to accommodate model load)
    const response = await axios.post(
      PREDICTION_API_URL,
      {
        disasterType,
        severity,
        affectedPopulation,
      },
      { timeout: 10000 }
    );

    return {
      ...response.data,
      source: "ml-service",
    };
  } catch (error) {
    // Log detailed error for troubleshooting
    try {
      console.error('Prediction service call failed:', {
        url: PREDICTION_API_URL,
        message: error.message,
        code: error.code,
        status: error.response?.status,
        responseData: error.response?.data,
      });
    } catch (logErr) {
      console.error('Prediction service call failed (could not serialize error):', logErr);
    }

    return {
      ...estimateLocally({ disasterType, severity, affectedPopulation }),
      warning: "ML prediction service unavailable; fallback estimate used.",
      source: "rule-based-fallback",
    };
  }
};

module.exports = { getPrediction };