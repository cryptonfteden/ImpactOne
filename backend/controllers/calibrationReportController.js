const calibrationReportService = require("../services/calibrationReportService");

async function getCalibrationReports(req, res, next) {
  try {
    const report = await calibrationReportService.computeCalibrationReports();
    res.json(report);
  } catch (error) {
    next(error);
  }
}

module.exports = { getCalibrationReports };
