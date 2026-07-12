const { analyzeInvestmentCommittee } = require("../services/investmentCommitteeService");
const { getCommitteeTrackRecord } = require("../services/committeeTrackRecordService");
const autonomousRecommendationRepository = require("../services/autonomousRecommendationRepository");
const { buildCanonicalVerdictView } = require("../services/canonicalVerdict");

/**
 * Sprint 18A — the committee debate is never shown as a standalone verdict.
 * When an ACTIVE, persisted Recommendation already exists for this symbol
 * (from the last scheduled autonomousRecommendationEngine run), it's looked
 * up read-only and attached as `relatedRecommendation` so the caller can
 * show "the platform's official call" exactly once. When none exists yet,
 * the debate is exploratory research only — no verdict pill implied.
 */
async function analyzeCommittee(req, res, next) {
  try {
    const symbol = req.query.symbol || req.body?.symbol || "NVDA";
    const context = req.body?.context || {};
    const intelligenceReport = req.body?.intelligenceReport || null;
    const altDataSummary = req.body?.altDataSummary || null;
    const marketImpact = req.body?.marketImpact || null;

    const [result, activeRecommendation] = await Promise.all([
      analyzeInvestmentCommittee({ symbol, context, intelligenceReport, altDataSummary, marketImpact }),
      autonomousRecommendationRepository.getActiveForSymbol(String(symbol || "").toUpperCase()).catch(() => null),
    ]);

    const canonicalVerdict = buildCanonicalVerdictView({
      recommendation: activeRecommendation,
      committeeDebate: result.committeeDebate,
    });

    res.json({
      ...result,
      relatedRecommendation: activeRecommendation
        ? {
            id: activeRecommendation.id,
            action: activeRecommendation.action,
            confidenceScore: Number(activeRecommendation.confidenceScore),
            qualityScore: Number(activeRecommendation.qualityScore),
            riskLabel: activeRecommendation.riskLabel,
            createdAt: activeRecommendation.createdAt,
          }
        : null,
      canonicalVerdict,
    });
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
