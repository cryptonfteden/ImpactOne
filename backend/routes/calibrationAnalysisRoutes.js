const express = require("express");
const controller = require("../controllers/calibrationAnalysisController");

const router = express.Router();
router.get("/", controller.getCalibrationReport);
module.exports = router;
