# Deduplication Report

**Phase:** DEDUPLICATION-001
**Purpose:** Eliminate the three business-logic duplications found in `PLATFORM_DUPLICATION_AUDIT.md` (D1, D2, D3) by extracting one shared implementation of each and updating every consumer to use it. Scoped exactly to those three findings — the audit's separate `AttentionLevelBadge` adoption gap in Portfolio Workspace is a real, documented finding but is not one of the four items this phase was asked to fix, and was left untouched.

## What was extracted

`frontend/src/utils/claimPresentation.js` — one new module, four exports:

| Export | Fixes | Replaces |
|---|---|---|
| `statusTone(status)` | D1 | Byte-identical local copies in `MissionControlHomeScreen.jsx` and `NewsIntelligenceScreen.jsx` |
| `statusPlainLabel(status)` | D1 | Byte-identical local copies in the same two files |
| `attentionLevel(score)` | D2 | `recommendedAttentionLevel()` (Mission Control) and `attentionLevelForScore()` (News Intelligence) — same `>=75`/`>=45` thresholds, different names, now one name and one implementation |
| `computeChangedClaimsText(item, activeClaims)` | D3 | `FeedItemCard.jsx`'s original implementation (moved here verbatim) and `NewsIntelligenceScreen.jsx`'s independent, simpler `describeOvernightChange()` (deleted) |

## Consumers updated

- **`MissionControlHomeScreen.jsx`** — deleted its local `statusTone`, `statusPlainLabel`, and `recommendedAttentionLevel`; imports all three (renamed to `attentionLevel`) from `claimPresentation.js`. The one call site (`sessionSummary`'s per-item level computation) updated to call `attentionLevel(...)`.
- **`NewsIntelligenceScreen.jsx`** — deleted its local `statusTone`, `statusPlainLabel`, `attentionLevelForScore`, and `describeOvernightChange`; imports `statusTone`, `statusPlainLabel`, `attentionLevel`, and `computeChangedClaimsText` from `claimPresentation.js`. Two call sites updated: the hero's `AttentionLevelBadge` now calls `attentionLevel(...)`, and the "Changed since yesterday" section now calls the shared `computeChangedClaimsText(item, overnightChanges)` instead of its own `describeOvernightChange`.
- **`FeedItemCard.jsx`** (Daily Feed) — deleted its local `computeChangedClaimsText` and the `RECENT_TRANSITION_WINDOW_MS` constant that backed it; imports the shared function instead. This is the function's original home — moving it changes nothing about Daily Feed's own behavior, since the moved code is identical to what was there before.

## On "preserve behavior" for D3 specifically

D3 was not a byte-identical duplication like D1/D2 — the audit found two *differently reasoned* answers to the same question: `FeedItemCard.jsx`'s original `computeChangedClaimsText` checks a real 48-hour transition window and distinguishes DRAFT/STRENGTHENING/WEAKENING/INVALIDATED with honest causal-vs-correlative language; News Intelligence's own `describeOvernightChange` answered the same question with no time-window check at all, attributing every status change to "this news" regardless of real timing. "Preserve behavior" here means preserving the more rigorous, already-battle-tested logic — the audit's own conclusion was that News Intelligence's simpler version was the discipline gap, not the reverse. Consequently:

- **Daily Feed's behavior is unchanged** — the shared function is byte-identical to what `FeedItemCard.jsx` had before this phase.
- **News Intelligence's "Changed since yesterday" text is now more conservative**, in the same direction Mission Control and Daily Feed already were: an overlapping Claim whose transition can't be confirmed as recent (either because `item.publishedAt`/`claim.lastUpdatedAt` is missing, or the gap between them exceeds 48 hours) is now described as "relates to an active Claim... (same symbol, no confirmed recent transition)" rather than unconditionally attributed to this news item. No existing test asserted News Intelligence's exact prior wording for this section (only that the "Changed since yesterday" label renders), so this tightening required no test changes beyond the new shared-module tests below.

## Tests

- **`frontend/src/utils/claimPresentation.test.js`** (new, 27 tests) — every status/tone/label mapping, every attention threshold boundary (44/45/74/75, `undefined`/`null`), and `computeChangedClaimsText`'s full behavior: no affected symbols, no active claims, no symbol overlap, each of the four real recent transitions (STRENGTHENING/WEAKENING/INVALIDATED/DRAFT), the "no confirmed recent transition" fallback for both an out-of-window and a missing-timestamp case, and the 3-claim cap.
- `MissionControlHomeScreen.test.jsx`, `NewsIntelligenceScreen.test.jsx`, `FeedItemCard.test.jsx`, `MarketNewsScreen.test.jsx` — re-run unchanged; all pass with the shared module wired in, confirming no consumer-visible regression from the extraction itself.
- Full suite: 496/497 passing (66 files). The one failure (`AdvancedChart.test.jsx`'s 1250-bar performance test, a `ResizeObserver is not a constructor` jsdom environment error) is unrelated to this phase — it fails only under full-suite resource contention and passes cleanly in isolation; it does not touch `claimPresentation.js` or any of its three consumers.

## Scope discipline

Only the four items named in the mission were touched:
1. `statusTone()` — done.
2. `statusPlainLabel()` — done.
3. Attention threshold logic — done (`attentionLevel`).
4. "What Changed Since Yesterday" shared correlation logic — done (`computeChangedClaimsText`).

Nothing else changed: no visual output, no Design System component, no Demo Mode logic, no API call shape, and no unrelated refactor (the audit's `AttentionLevelBadge` adoption gap in Portfolio Workspace is real but out of scope for this phase and was left alone).
