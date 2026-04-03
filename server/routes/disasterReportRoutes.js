const express = require("express");
const {
  createDisasterReport,
  listDisasterReports,
  getDisasterReportById,
  updateDisasterReport,
  deleteDisasterReport,
} = require("../controllers/disasterReportController");

const router = express.Router();

router.post("/", createDisasterReport);
router.get("/", listDisasterReports);
router.get("/:id", getDisasterReportById);
router.put("/:id", updateDisasterReport);
router.delete("/:id", deleteDisasterReport);

module.exports = router;
