const calibrationAnalysisService = require("../services/calibrationAnalysisService");

async function getCalibrationReport(req, res, next) {
  try {
    res.json(await calibrationAnalysisService.getCalibrationReport());
  } catch (error) {
    next(error);
  }
}

module.exports = { getCalibrationReport };
