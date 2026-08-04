const outcomeFeedbackService = require("../services/outcomeFeedbackService");

async function getScoringAdjustments(req, res, next) {
  try {
    res.json(await outcomeFeedbackService.computeAndAuditActionAdjustments());
  } catch (error) {
    next(error);
  }
}

async function getAuditHistory(req, res, next) {
  try {
    res.json(await outcomeFeedbackService.getAuditHistory({ adjustmentKey: req.query.adjustmentKey }));
  } catch (error) {
    next(error);
  }
}

module.exports = { getScoringAdjustments, getAuditHistory };
