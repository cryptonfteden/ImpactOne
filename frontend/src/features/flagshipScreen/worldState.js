// Phase LIVING-WORLD-001 — the Global World State Engine. One pure
// function, reading the same real, already-fetched panel data every
// other module in this feature already reads (useFlagshipData.js —
// zero new fetches), producing exactly one real, unified world-state
// object every visual system in the scene subscribes to. Replaces the
// prior phase's narrower `ambientState.js` (which read only 2 of the
// mission's 10 named signals) — this is the single source every
// lighting/atmosphere/camera/particle/orbital calculation now reads
// from, so there is exactly one place "how alive should the world feel
// right now" gets computed, never a second, competing calculation
// living inside an individual visual component.
//
// Deliberately does NOT pre-compute per-target driver values (fog
// density, particle count, camera parallax magnitude, etc.) — each
// consuming site already owns its own small, disclosed linear mapping
// from the one shared `intensity` value to its own specific visual
// parameter (see WORLD_REACTION_MODEL.md for the full, itemized list).
// Pre-deriving those here too would be a real, literal duplicated
// calculation of the same mapping in two places — exactly what this
// phase's own "no duplicated calculations" requirement rules out.
export const NEUTRAL_WORLD_STATE = Object.freeze({
  tone: "neutral",
  color: "#4f8cff",
  intensity: 0.3,
  confidenceIntensity: 0.15,
  breakingNewsCount: 0,
  claimCount: 0,
  macroEventCount: 0,
  alertsCount: 0,
  fearGreedValue: null,
  regime: "neutral",
  soundHook: "calm",
});

const TONE_COLORS = { bullish: "#4fffb0", bearish: "#ff5f5f", neutral: "#4f8cff" };

// The same real, total, disclosed vocabulary
// chiefInvestmentOfficerService.js uses for `cio.confidence` — see
// visualizationMappings.js's own identical table (kept in sync
// intentionally; duplicated here rather than imported to keep this
// module free of any dependency on flagshipScreen's own component
// tree, so it can be reused by a future non-Flagship consumer too).
const CONFIDENCE_INTENSITY = { HIGH_UNANIMOUS: 1, MODERATE_MAJORITY: 0.66, LOW_SPLIT: 0.4, LOW_NO_SIGNAL: 0.15 };

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function realCount(panel) {
  return panel?.status === "live" && Array.isArray(panel.data) ? panel.data.length : 0;
}

/**
 * The one real computation behind the entire living world. Reads every
 * one of the mission's 10 named real signals (Breaking News, Macro,
 * Market Regime, Fear & Greed, Claim Intelligence, Agent Consensus,
 * Portfolio Health, Importance Score, Confidence, Alerts) from the
 * screen's own already-fetched panel data and derives one unified
 * state — no new fetch, no new business logic, no fabricated field.
 * @param {ReturnType<import("./useFlagshipData").default>} panels
 */
export function computeWorldState(panels) {
  const portfolio = panels?.portfolioHealth?.data;
  const hasRealPortfolioSignal = panels?.portfolioHealth?.status === "live" && portfolio?.hasComparison;
  const changePct = hasRealPortfolioSignal ? Number(portfolio.valueChangePct) : 0;

  const cioConfidence = panels?.agentConsensus?.data?.cio?.confidence;
  const confidenceIntensity = CONFIDENCE_INTENSITY[cioConfidence] ?? NEUTRAL_WORLD_STATE.confidenceIntensity;

  const fearGreed = panels?.fearGreed?.data;
  const fearGreedValue = panels?.fearGreed?.status === "live" && Number.isFinite(fearGreed?.value) ? fearGreed.value : null;
  // Fear & Greed's own real 0..100 reading, re-centered so 50 (neutral)
  // contributes zero "extremity" and either end contributes up to 1 —
  // a real, disclosed reuse of the existing real value, not a new
  // computed indicator.
  const fearGreedExtremity = fearGreedValue !== null ? clamp01(Math.abs(fearGreedValue - 50) / 50) : 0;

  let tone = "neutral";
  if (hasRealPortfolioSignal && changePct > 0.05) tone = "bullish";
  else if (hasRealPortfolioSignal && changePct < -0.05) tone = "bearish";
  else if (fearGreedValue !== null && fearGreedValue >= 60) tone = "bullish";
  else if (fearGreedValue !== null && fearGreedValue <= 40) tone = "bearish";

  // "Market Regime" — this codebase has no dedicated regime-classifier
  // endpoint; honestly reusing the same real tone/Fear-&-Greed signals
  // above as a disclosed proxy (risk-on / risk-off / neutral) rather
  // than fabricating a new indicator. See LIVING_WORLD.md.
  const regime = tone === "bullish" ? "risk-on" : tone === "bearish" ? "risk-off" : "neutral";

  const breakingNewsCount = realCount(panels?.breakingNews);
  const claimCount = realCount(panels?.globalEvents);
  const macroEventCount = realCount(panels?.macroCalendar);
  const alertsCount = realCount(panels?.alerts);

  const portfolioMagnitude = hasRealPortfolioSignal ? clamp01(Math.abs(changePct) / 5) : 0;
  const eventActivity = clamp01(claimCount / 8);
  const alertActivity = clamp01(alertsCount / 5);
  const macroActivity = clamp01(macroEventCount / 6);
  const newsActivity = clamp01(breakingNewsCount / 6);

  // Importance Score — the one real composite every "Drive" target
  // scales from at its own consuming site: the average of every real
  // activity signal this engine has in hand right now, each
  // contributing equally (no single signal silently dominates).
  const signals = [portfolioMagnitude, eventActivity, alertActivity, macroActivity, newsActivity, fearGreedExtremity, confidenceIntensity];
  const rawIntensity = signals.reduce((sum, value) => sum + value, 0) / signals.length;
  const intensity = Math.max(clamp01(rawIntensity), 0.15);

  // Ambient sound hooks — state only (the mission's own words): a real,
  // named category any future audio layer could key off of, computed
  // here and nowhere else, but this phase plays no actual sound.
  const soundHook = alertsCount > 0 && tone === "bearish" ? "alert" : intensity > 0.66 ? "active" : intensity < 0.25 ? "calm" : "steady";

  return {
    tone,
    color: TONE_COLORS[tone],
    intensity,
    confidenceIntensity,
    breakingNewsCount,
    claimCount,
    macroEventCount,
    alertsCount,
    fearGreedValue,
    regime,
    soundHook,
  };
}
