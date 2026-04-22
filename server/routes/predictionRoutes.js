const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../config/auth");
const { predictResources, getPredictionLogs } = require("../controllers/predictionController");

router.post(
	"/",
	authenticateToken,
	authorizeRoles("admin", "allocation_officer", "inventory_officer"),
	predictResources
);

router.get(
	"/logs",
	authenticateToken,
	authorizeRoles("admin", "inventory_officer"),
	getPredictionLogs
);

module.exports = router;