const express = require("express");
const {
  listAllocations,
  getAllocationByReport,
  upsertAllocationByReport,
  clearAllocationByReport,
} = require("../controllers/allocationController");

const router = express.Router();

router.get("/", listAllocations);
router.get("/by-report/:reportId", getAllocationByReport);
router.put("/by-report/:reportId", upsertAllocationByReport);
router.delete("/by-report/:reportId", clearAllocationByReport);

module.exports = router;
