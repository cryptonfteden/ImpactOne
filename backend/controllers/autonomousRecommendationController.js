const autonomousRecommendationRepository = require("../services/autonomousRecommendationRepository");
const autonomousRecommendationEngine = require("../services/autonomousRecommendationEngine");
const schedulerService = require("../services/schedulerService");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
}

async function listRecommendations(req, res, next) {
  try {
    const { status, symbol } = req.query;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const recommendations = status || symbol
      ? await autonomousRecommendationRepository.listAll({ status, symbol, limit })
      : await autonomousRecommendationRepository.listActive({ limit });

    res.json({ recommendations });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getRecommendation(req, res, next) {
  try {
    const recommendation = await autonomousRecommendationRepository.getById(req.params.id);
    if (!recommendation) {
      return res.status(404).json({ error: "Recommendation not found." });
    }
    res.json(recommendation);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function runRecommendationEngine(req, res, next) {
  try {
    const watchlist = Array.isArray(req.body?.watchlist) ? req.body.watchlist : [];
    const result = await autonomousRecommendationEngine.runOnce({ watchlist });
    res.status(201).json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getEngineStatus(req, res, next) {
  try {
    const [status, latestRunLog] = await Promise.all([
      Promise.resolve(schedulerService.getStatus()),
      autonomousRecommendationRepository.getLatestRunLog(),
    ]);
    res.json({ ...status, latestRunLog });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

// Sprint 16 Phase D — separate resource from the main detail response, so
// the (more verbose) audit payload only downloads when specifically asked
// for.
async function getRecommendationDecisionTrace(req, res, next) {
  try {
    const recommendation = await autonomousRecommendationRepository.getById(req.params.id);
    if (!recommendation) {
      return res.status(404).json({ error: "Recommendation not found." });
    }

    const trace = await autonomousRecommendationRepository.getDecisionTraceByRecommendationId(req.params.id);
    if (!trace) {
      return res.status(404).json({ error: "Decision trace not found." });
    }

    res.json(trace);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

const VALID_FEEDBACK_TYPES = ["USEFUL", "NOT_USEFUL", "TOO_EARLY", "TOO_LATE", "ALREADY_KNEW", "DONT_UNDERSTAND"];

// Sprint 29 — Feedback Intelligence Layer, Priority 2. Pure capture: this
// endpoint only persists the feedback row and returns it. Nothing here
// reads it back into scoring — feedback becomes evidence for future
// calibration work, never an immediate influence on today's
// recommendation, per the sprint mission's explicit rule.
async function submitRecommendationFeedback(req, res, next) {
  try {
    const { feedbackType } = req.body || {};
    if (!VALID_FEEDBACK_TYPES.includes(feedbackType)) {
      return res.status(400).json({ error: `feedbackType must be one of: ${VALID_FEEDBACK_TYPES.join(", ")}` });
    }

    const recommendation = await autonomousRecommendationRepository.getById(req.params.id);
    if (!recommendation) {
      return res.status(404).json({ error: "Recommendation not found." });
    }

    const feedback = await autonomousRecommendationRepository.createFeedback({ recommendationId: req.params.id, feedbackType });
    res.status(201).json(feedback);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function listRecommendationFeedback(req, res, next) {
  try {
    const recommendation = await autonomousRecommendationRepository.getById(req.params.id);
    if (!recommendation) {
      return res.status(404).json({ error: "Recommendation not found." });
    }

    const feedback = await autonomousRecommendationRepository.listFeedbackForRecommendation(req.params.id);
    res.json({ feedback });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = {
  listRecommendations,
  getRecommendation,
  runRecommendationEngine,
  getEngineStatus,
  getRecommendationDecisionTrace,
  submitRecommendationFeedback,
  listRecommendationFeedback,
};
