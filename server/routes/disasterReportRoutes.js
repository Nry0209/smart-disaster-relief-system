const express = require("express");
const {
  createDisasterReport,
  listDisasterReports,
  getDisasterReportById,
  updateDisasterReport,
  deleteDisasterReport,
  allocateResources,
  updateAllocation,
  deallocateResources,
} = require("../controllers/disasterReportController");
const {
  authenticateToken,
  authorizeRoles,
  dmcOfficerOnly,
  internalStaffOnly,
} = require("../config/auth");

const router = express.Router();

router.post("/", authenticateToken, authorizeRoles("admin", "dmc_officer"), createDisasterReport);
router.get("/", authenticateToken, internalStaffOnly, listDisasterReports);
router.get("/:id", authenticateToken, internalStaffOnly, getDisasterReportById);
router.put("/:id", authenticateToken, dmcOfficerOnly, updateDisasterReport);
router.delete("/:id", authenticateToken, dmcOfficerOnly, deleteDisasterReport);

// Allocation routes
router.post("/:id/allocate", authenticateToken, internalStaffOnly, allocateResources);
router.put("/:id/allocate", authenticateToken, internalStaffOnly, updateAllocation);
router.delete("/:id/allocate", authenticateToken, internalStaffOnly, deallocateResources);

module.exports = router;
