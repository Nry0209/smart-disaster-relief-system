const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../config/auth");
const { predictResources, getPredictionLogs, deletePredictionLog } = require("../controllers/predictionController");

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

router.delete(
	"/logs/:id",
	authenticateToken,
	authorizeRoles("admin", "inventory_officer"),
	deletePredictionLog
);

module.exports = router;