const { analyzeInvestmentCommittee } = require("../services/investmentCommitteeService");
const { getCommitteeTrackRecord } = require("../services/committeeTrackRecordService");

async function analyzeCommittee(req, res, next) {
  try {
    const symbol = req.query.symbol || req.body?.symbol || "NVDA";
    const context = req.body?.context || {};
    const intelligenceReport = req.body?.intelligenceReport || null;
    const altDataSummary = req.body?.altDataSummary || null;
    const marketImpact = req.body?.marketImpact || null;

    const result = await analyzeInvestmentCommittee({
      symbol,
      context,
      intelligenceReport,
      altDataSummary,
      marketImpact,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getCommitteeTrackRecordController(req, res, next) {
  try {
    const symbol = req.query.symbol || undefined;
    const result = await getCommitteeTrackRecord({ symbol });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  analyzeCommittee,
  getCommitteeTrackRecordController,
};
