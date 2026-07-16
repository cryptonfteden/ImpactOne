const express = require("express");
const { getCalibrationReports } = require("../controllers/calibrationReportController");

const router = express.Router();

router.get("/", getCalibrationReports);

module.exports = router;
