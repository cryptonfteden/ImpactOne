// Phase IMMERSIVE-INTERACTIONS-001 — pure, dependency-free mapping from
// the flagship screen's own already-fetched real data (useFlagshipData.js)
// to an "ambient state" the Earth scene renders. The mission is explicit:
// "all visual intensity must be driven by live data... no idle movement
// without meaning." This replaces the prior phase's purely decorative,
// constant sine-wave atmosphere pulse with a real, data-derived tone/
// intensity — no new computation of investment meaning, just a
// presentation-layer read of fields this screen already has in hand.
export const NEUTRAL_AMBIENT_STATE = { tone: "neutral", intensity: 0.3, color: "#4f8cff" };

const TONE_COLORS = {
  bullish: "#4fffb0",
  bearish: "#ff5f5f",
  neutral: "#4f8cff",
};

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

/**
 * @param {{ portfolioHealth?: { status: string, data: any }, globalEvents?: { status: string, data: any[] } }} panels
 * @returns {{ tone: "bullish"|"bearish"|"neutral", intensity: number, color: string }}
 */
export function computeAmbientState(panels) {
  const portfolio = panels?.portfolioHealth?.data;
  const globalEvents = panels?.globalEvents?.data;

  const hasRealPortfolioSignal = panels?.portfolioHealth?.status === "live" && portfolio?.hasComparison;
  const changePct = hasRealPortfolioSignal ? Number(portfolio.valueChangePct) : 0;

  let tone = "neutral";
  if (hasRealPortfolioSignal && changePct > 0.05) tone = "bullish";
  else if (hasRealPortfolioSignal && changePct < -0.05) tone = "bearish";

  // Two real, independent signals of "how much is happening right now,"
  // averaged: the real magnitude of the portfolio's own daily move, and
  // the real count of currently active global events. Each is honestly
  // 0 when its own real data isn't live yet, rather than assuming
  // activity that hasn't been confirmed.
  const portfolioMagnitude = hasRealPortfolioSignal ? clamp01(Math.abs(changePct) / 5) : 0;
  const eventActivity =
    panels?.globalEvents?.status === "live" && Array.isArray(globalEvents) ? clamp01(globalEvents.length / 8) : 0;
  const intensity = clamp01((portfolioMagnitude + eventActivity) / 2 || NEUTRAL_AMBIENT_STATE.intensity);

  return { tone, intensity: Math.max(intensity, 0.15), color: TONE_COLORS[tone] };
}
