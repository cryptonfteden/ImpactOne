const decisionReviewService = require("../services/decisionReviewService");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
}

async function getDecisionReview(req, res, next) {
  try {
    const review = await decisionReviewService.getDecisionReview(req.params.id);
    res.json(review);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getDecisionReview };
