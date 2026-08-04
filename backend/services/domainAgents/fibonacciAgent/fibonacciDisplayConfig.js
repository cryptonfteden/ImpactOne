// Phase FIBONACCI-DEFAULTS-001 — the approved default DISPLAY
// configuration for the Fibonacci drawing tool a future chart UI would
// render this agent's levels with. This is disclosed, static metadata
// only — no rendering, no chart, no UI is implemented here or anywhere
// in this agent (the original FIBONACCI-AGENT-001 mission's "No UI"
// requirement still holds). It changes no scoring, confluence, or
// confidence logic; it is exposed on the report purely so a future
// consumer has the approved defaults without guessing them.
const DEFAULT_DISPLAY_CONFIG = Object.freeze({
  trendLine: "ENABLED",
  extend: "NONE", // "Don't extend"
  background: "ENABLED",
  reverse: "DISABLED",
  prices: "ENABLED",
  levelsDisplay: "VALUES", // "Levels: Values"
  labelsPosition: "LEFT_TOP", // "Labels: Left / Top"
  textAlignment: "CENTER_MIDDLE", // "Text: Center / Middle"
  fontSize: 12,
  logScale: "DISABLED",
});

module.exports = { DEFAULT_DISPLAY_CONFIG };
