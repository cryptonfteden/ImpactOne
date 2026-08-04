const qualityDashboardService = require("../services/qualityDashboardService");
const learningLoopService = require("../services/learningLoopService");

async function getQualityDashboard(req, res, next) {
  try {
    const dashboard = await qualityDashboardService.computeQualityDashboard();
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
}

// Sprint 30 Priority 3 — internal only, same VITE_DEV_CONSOLE-gated
// frontend surface as the quality dashboard itself.
async function getLearningSignals(req, res, next) {
  try {
    const signals = await learningLoopService.computeLearningSignals();
    res.json(signals);
  } catch (error) {
    next(error);
  }
}

module.exports = { getQualityDashboard, getLearningSignals };
