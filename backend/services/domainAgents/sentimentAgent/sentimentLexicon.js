// Phase SENTIMENT-AGENT-001 — a disclosed, hand-set, finance-domain
// keyword lexicon used to deterministically score REAL article text.
// This is explicitly a keyword heuristic, NOT NLP/ML/LLM sentiment
// classification — the same accepted pattern this codebase's own
// services/intelligence/socialInfluenceService.js already uses for
// real post text. Every score traces back to real words that actually
// appear in real fetched text; nothing here is invented per-article.
const POSITIVE_WORDS = [
  "beat", "beats", "beating", "surge", "surges", "surged", "soar", "soars", "soared",
  "rally", "rallies", "rallied", "growth", "grow", "grows", "grew", "record", "strong",
  "strength", "upgrade", "upgraded", "outperform", "bullish", "gain", "gains", "gained",
  "profit", "profits", "profitable", "expand", "expands", "expansion", "win", "wins",
  "winning", "success", "successful", "breakthrough", "innovative", "innovation",
  "raise", "raised", "raises", "boost", "boosted", "optimistic", "optimism", "exceed",
  "exceeds", "exceeded", "positive", "recovery", "recovers", "recovered", "milestone",
];

const NEGATIVE_WORDS = [
  "miss", "misses", "missed", "plunge", "plunges", "plunged", "slump", "slumps", "slumped",
  "decline", "declines", "declined", "downgrade", "downgraded", "underperform", "bearish",
  "loss", "losses", "lawsuit", "sue", "sued", "investigation", "probe", "fraud", "scandal",
  "recall", "recalls", "recalled", "layoff", "layoffs", "cut", "cuts", "cutting", "weak",
  "weakness", "warning", "warns", "warned", "concern", "concerns", "risk", "risks", "risky",
  "crash", "crashes", "crashed", "sell-off", "selloff", "bankrupt", "bankruptcy", "default",
  "negative", "disappointing", "disappoint", "disappoints", "delay", "delays", "delayed",
];

const POSITIVE_SET = new Set(POSITIVE_WORDS);
const NEGATIVE_SET = new Set(NEGATIVE_WORDS);

function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase().match(/[a-z][a-z-]*/g) || [];
}

/**
 * @param {string|null} text
 * @returns {{ positiveHits: number, negativeHits: number, score: number }}
 *   score is in [-1, 1]: (positiveHits - negativeHits) / totalWords, 0 for empty/neutral text.
 */
function scoreText(text) {
  const tokens = tokenize(text);
  if (!tokens.length) return { positiveHits: 0, negativeHits: 0, score: 0 };

  let positiveHits = 0;
  let negativeHits = 0;
  for (const token of tokens) {
    if (POSITIVE_SET.has(token)) positiveHits += 1;
    else if (NEGATIVE_SET.has(token)) negativeHits += 1;
  }

  const score = tokens.length > 0 ? (positiveHits - negativeHits) / tokens.length : 0;
  return { positiveHits, negativeHits, score };
}

module.exports = { scoreText, tokenize, POSITIVE_WORDS, NEGATIVE_WORDS };
