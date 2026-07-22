// Sprint 42 — Internal Quality Platform API. Read-only analytics
// endpoints; no public UI required yet (per this sprint's mission).
const recommendationLifecycleService = require("../services/qualityPlatform/recommendationLifecycleService");
const committeeScorecardService = require("../services/qualityPlatform/committeeScorecardService");
const cioScorecardService = require("../services/qualityPlatform/cioScorecardService");
const evidenceScorecardService = require("../services/qualityPlatform/evidenceScorecardService");

function parseWindowDays(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

async function getRecommendationLifecycle(req, res, next) {
  try {
    res.json(await recommendationLifecycleService.getLifecycle(req.params.recommendationId));
  } catch (error) {
    next(error);
  }
}

async function getCommitteeScorecard(req, res, next) {
  try {
    res.json(await committeeScorecardService.getCommitteeScorecard({ windowDays: parseWindowDays(req.query.windowDays) }));
  } catch (error) {
    next(error);
  }
}

async function getCommitteeScorecardRollup(req, res, next) {
  try {
    res.json(await committeeScorecardService.getCommitteeScorecardRollup());
  } catch (error) {
    next(error);
  }
}

async function getCioScorecard(req, res, next) {
  try {
    res.json(await cioScorecardService.getCioScorecard({ windowDays: parseWindowDays(req.query.windowDays) }));
  } catch (error) {
    next(error);
  }
}

async function getEvidenceScorecard(req, res, next) {
  try {
    res.json(await evidenceScorecardService.getEvidenceScorecard({ windowDays: parseWindowDays(req.query.windowDays) }));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRecommendationLifecycle,
  getCommitteeScorecard,
  getCommitteeScorecardRollup,
  getCioScorecard,
  getEvidenceScorecard,
};
