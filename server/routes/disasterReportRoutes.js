const express = require("express");
const {
  createDisasterReport,
  listDisasterReports,
} = require("../controllers/disasterReportController");

const router = express.Router();

router.post("/", createDisasterReport);
router.get("/", listDisasterReports);

module.exports = router;
