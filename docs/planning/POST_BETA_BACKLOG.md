# Post-Beta Backlog — Phase X8, Part 4 (Release Hardening)

Every known, real, currently-open warning or gap, classified Critical / High / Medium / Low. Per the mission, only Critical and High may block the beta — none were found. Everything below is real (found via live testing, `npm audit`, or an earlier phase's documented-not-fixed finding), never invented to pad the list.

## Critical — none found

No issue found this phase (or carried from any prior phase's documentation) meets a Critical bar (app-breaking, data-loss, or cross-user data leak). The one issue that *would* have been Critical — the identity/onboarding global-state leak — was found and fixed in Part 1 this same phase, so it is not carried forward as an open item.

## High — none found

No open issue blocks a real beta user from completing their journey. The full human-flow audit (`PRIVATE_BETA_CERTIFICATION.md`) completed invite → onboarding → every required screen → logout → login again, live, with zero dead ends.

## Medium

| # | Issue | Why Medium, not High | Recommended timing |
|---|---|---|---|
| 1 | The "Skip" (no-identity/legacy) onboarding path can create a `betaUserId: null` profile that a *different*, also-identity-less browser session would later see (see `IDENTITY_FLOW_AUDIT.md`'s disclosed edge case) | Requires the same rare condition twice (two separate sessions both failing to resolve a real identity) — not the common path, and does not leak a *real* beta user's data (fixed in Part 1) | Operational mitigation already documented (avoid "Skip" on any beta-adjacent browser); a structural fix (e.g. removing the Skip option entirely during the live beta window) is a real, low-effort option for the next phase if this doesn't map cleanly to 2 real users |
| 2 | Two competing color-token systems in `styles.css` (a legacy `--success`/`--danger` pair alongside the spec-matching `--h3-positive`/`--h3-negative`) — documented, not fixed, in `PRODUCT_CONSISTENCY_AUDIT.md` (Phase X7) | Visual-only, no functional impact; the two palettes are close in hue, not jarring | Post-beta, needs a verified one-at-a-time migration (each affected component checked by eye), not a blind find-and-replace |
| 3 | `cors()` has no origin allowlist (unrestricted) | Disclosed and accepted since Phase X7's release-quality audit as a known tradeoff for a 2-user private beta with no public exposure plan | Revisit before any wider release beyond the 2 named beta users |

## Low

| # | Issue | Source |
|---|---|---|
| 4 | `StockSidePanel.jsx` has no Escape-key handler — only the explicit "Close" button dismisses it | Found live this phase (Part 3 human-flow audit) |
| 5 | Two legacy CSS selectors (`.search-box`, `.market-pill`) use raw hex colors untracked to any design token | `PRODUCT_CONSISTENCY_AUDIT.md` (X7), not fixed |
| 6 | `.hero-panel`/`.screen-hero` hardcode a 24px corner radius, 2px over the documented 20-22px ceiling | `PRODUCT_CONSISTENCY_AUDIT.md` (X7), not fixed |
| 7 | `npm audit` reports 4 known vulnerabilities in backend dev-tooling dependencies (`@prisma/dev`'s transitive `@hono/node-server`, `fast-uri`) — none in a runtime request path | `X7_COMPLETION_REPORT.md`'s Part 7 audit |
| 8 | `OnboardingFlow.jsx`'s form-submission error (`submitError`) still uses the `error?.message \|\| fallback` pattern the rest of the app was swept for in Phase X7-RC — deliberately left alone at the time since it may legitimately need to show real backend validation text (e.g. "age is required"), not just a generic fallback | `X7_RC_REPORT.md` (documented, not touched) |
| 9 | Home Summary's cold-start latency (multi-second on a cold process, ~50-150ms warm) remains unoptimized — disclosed since Phase X6, reconfirmed present in this phase's measurements, never a crash or blank screen | `RC1_COMPLETION_REPORT.md` / `X7_RC_REPORT.md` |

## Closed this phase (for completeness, not carried forward)

- The identity/onboarding global-state bug (Part 1) — would have been Critical had it reached the real beta users; fixed and verified.
- The 9-screen raw-error-message leak (Phase X7-RC) — already closed prior to this phase, reconfirmed still closed by this phase's human-flow audit (no raw technical text observed on any screen).
- The long-standing `portfolioEngineService.test.js` flake (Phase X7-RC) — already closed, reconfirmed by this phase's full backend suite (666/666, then 669/669 after this phase's own new tests — see `X8_COMPLETION_REPORT.md`).

## Recommendation

**Nothing in this backlog blocks the beta.** All Medium and Low items are real, disclosed, and scheduled as real post-beta work — none affects a beta user's ability to complete their journey today.
