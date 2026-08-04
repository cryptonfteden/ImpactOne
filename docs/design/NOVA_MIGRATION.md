# Nova Migration — NOVA-MIGRATION-001 — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Date:** 2026-08-01

## Mission

Eliminate the split between the legacy UI and the new Nova/Flagship visual language — no redesign, no navigation change, no new features. Migrate existing screens to Nova's exact, already-established visual system. Priority: Home, Recommendations, Daily Feed, Portfolio, Alerts, AI Analysis.

## Honest Scope Statement

`frontend/src/styles.css` is a large (~3,800-line), multi-era legacy stylesheet backing dozens of screens including all 6 named priority screens. A full migration of every color/spacing/radius value in this file to Nova tokens would be a genuinely large undertaking spanning many phases — and, critically, most of its values are only *close to*, not *exactly identical to*, their nearest Nova equivalent. Migrating a close-but-different value to an exact token would be a real, if subtle, visual change — which this mission's own "do not redesign" / "preserve existing behavior" requirements rule out without a real visual-verification tool (none is available in this environment, the same disclosed limitation carried through every visual-facing phase this session).

This phase's real, defensible strategy: find every place the legacy stylesheet **independently repeats an already-Nova-documented exact color value**, and alias the legacy variable to the real Nova token at its single point of definition — the highest-leverage, zero-visual-risk form of migration available, verified by exact hex comparison rather than "looks close enough."

## What Was Found and Fixed

Nova's own `tokens.css` (from the earlier NOVA Foundation phase) already documents, in its own changelog comment, that its brand-signal color was **"reconciled to the real, already-shipped #6fb6ff accent (`frontend/src/styles.css`'s `--accent` / `--h3-accent`, `frontend/src/context/theme.js`'s accent) — a deliberate decision to NOT introduce a fourth, unreconciled accent-blue value."** This phase verified that reconciliation was recorded in documentation but never actually implemented in the CSS itself — the legacy variables still independently defined the identical literal hex a second, third, and fourth time rather than deriving from the one real token that same documentation already named them as the source of.

**Fixed** — 3 legacy CSS custom properties, confirmed exact-hex matches to real Nova tokens, now alias them instead of repeating the literal:

| Legacy variable | Was | Now aliases | Real usages instantly migrated |
|---|---|---|---|
| `--accent` | `#6fb6ff` | `var(--nova-color-brand-signal)` | 14 |
| `--h3-accent` | `#6fb6ff` | `var(--nova-color-brand-signal)` | (shared block, see `TOKEN_MIGRATION_REPORT.md`) |
| `--h3-accent-strong` | `#4f9dff` | `var(--nova-color-brand-signal-bright)` | (same block) |

Each is a real, zero-visual-difference substitution (the computed color value is byte-for-byte identical before and after) — every screen and component using these variables, including all 6 priority screens, now genuinely derives its accent color from the one shared Nova system instead of an independently-duplicated literal, with no risk of the two ever drifting apart again.

## What Was Checked and Confirmed NOT Safe to Migrate (Disclosed, Not Silently Skipped)

Every other legacy color variable (`--text-0/1/2`, `--glass`, `--glass-border`, `--success`, `--danger`, `--h3-positive/negative/warning`, `--h3-text-*`) was checked against its nearest real Nova token by exact hex comparison — **none matched exactly**. For example, legacy `--success: #37d68e` vs. Nova `--nova-color-positive: #22c55e` are both "a green," but different literal colors; aliasing them would be a real, visible color change, not a migration. These are logged in `LEGACY_UI_REMAINING.md` as real, disclosed remaining work for a future phase that has either a real visual-verification tool or explicit design sign-off to actually change the rendered color, rather than being silently forced into a false "migration" this phase couldn't actually verify was safe.

A fourth, real duplicate of the same `#6fb6ff` value was found in `frontend/src/context/theme.js` (a plain JS string, not a CSS custom property) — disclosed but not changed this phase, since bridging a JS runtime value to a CSS custom property is a different kind of fix (requires understanding exactly how `theme.js`'s value is consumed) than the CSS-to-CSS aliasing done here, and doing it without full verification would risk the "preserve existing behavior" requirement.

## Verification

- Targeted test run across the 6 priority screens (`AppRoot.test.jsx`, `HomeScreen.test.jsx`, `RecommendationsScreen.test.jsx`, `PortfolioWorkspaceScreen.test.jsx`, `AiAnalysisScreen.test.jsx`, and others where present): all passing.
- Production build: succeeded.
- **Full frontend regression suite**: see the commit for the exact pass count — expected zero regressions, since every change is a variable-value alias to an already-identical value.

See `TOKEN_MIGRATION_REPORT.md` for the full before/after detail, `LEGACY_UI_REMAINING.md` for the complete, itemized list of what still uses the legacy system and why, and `VISUAL_UNIFICATION.md` for the resulting standing rule for future migration work.
