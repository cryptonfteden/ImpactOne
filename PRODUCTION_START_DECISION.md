# PRODUCTION_START_DECISION.md — Phase REMOTE-AND-DEPLOYMENT-VERIFICATION-001

## Verdict

# PRODUCTION PILOT REJECTED

## Basis for this verdict

This mission asked to independently verify the GitHub backup and the first production deployment. The GitHub backup portion is **real, verified, and accurate** — every claim in `GITHUB_BACKUP_REPORT.md`/`REMOTE_INTEGRITY_REPORT.md` was independently re-confirmed against the actual GitHub remote (see `REMOTE_BACKUP_AUDIT.md`): local HEAD matches remote HEAD exactly, the `impactone-rc2` tag is real and correctly placed, `userRepository.js` and the corrected dependency manifest are genuinely present on GitHub, and a completely fresh clone from the real remote URL installs and boots successfully end to end.

**But the deployment portion — the actual subject of a "production pilot" decision — does not exist.** Independently confirmed, not merely trusted from `PRODUCTION_DEPLOYMENT_RESULT.md`'s own honest disclosure: zero hosting configuration exists anywhere in the repository, no frontend or backend HTTPS URL exists anywhere, and `DEPLOYED_ENVIRONMENT_MATRIX.md` itself lists every required production variable as not yet provisioned. There is nothing for a "production pilot" to begin against. A verdict of "REJECTED" here is not a judgment on code quality — the underlying application is close, and the GitHub-backup work is genuinely solid — it reflects the simple, verified fact that **the thing this mission asks to approve for pilot use has not been built yet.**

This is compounded by one additional, independently-confirmed, unresolved Critical finding: a real `FINNHUB_API_KEY` and a real, correctly-shaped `OPENAI_API_KEY` are present in git history that is now confirmed pushed to GitHub. The repository is private (independently confirmed via anonymous-fetch 404s against both the repo page and raw file content), which meaningfully limits — but does not eliminate — the exposure. No evidence was found that these keys have actually been rotated yet, despite the operator's documented decision to do so. Deploying to production with these still-unrotated values, or before confirming rotation, would mean launching with already-compromised credentials.

Two further High-severity findings, independently reconfirmed live this phase, would each on their own warrant at least "APPROVED WITH CONDITIONS" once a real deployment exists: the long-documented AI-trust "repeated generic reasoning" defect remains live on Daily Feed (Fed rate hike / FOMC Rate Decision, still byte-identical) and, more seriously, on the Recommendations screen itself (GOOGL/NVDA/MSFT sharing byte-identical key reasoning fields) — the highest-stakes surface in the product. Watchlist Folders and related features remain broken for any Guest/no-invite-code session.

## What is genuinely good and should be credited

- The GitHub backup is real, complete, and independently verified — not partial, not fabricated.
- Clean-clone reproducibility from the real remote is genuinely proven, twice over (once via a local-path clone in the prior `RC2-STABILIZATION-001` phase, once via a real network clone this phase) — the two Critical clean-clone blockers found by the original `RC1-INDEPENDENT-VERIFICATION-001` audit are both durably fixed and present on GitHub.
- Every phase in this recent arc has correctly refused to fabricate deployment success in the absence of real hosting credentials — this is exactly the disciplined behavior this mission's own instructions call for, and this audit found no instance of it being violated.
- Real API data, honest empty/error states, and a genuinely functioning 3D Flagship scene were all confirmed live against the local dev instance this phase.

## What would change this verdict

Once a real deployment exists (hosting platform chosen, real Postgres provisioned, real secrets generated, real `CORS_ALLOWED_ORIGINS`/`VITE_API_BASE_URL` set, deployed, and the exposed keys confirmed rotated), this exact verification phase should be re-run against the real resulting URLs. If Sections 2/3/5 of this mission's checklist all pass against real infrastructure, and the two High findings (H1/H2 in `POST_DEPLOYMENT_RISK_REGISTER.md`) are at least disclosed with a clear closure plan, the most likely next verdict is **PRODUCTION PILOT APPROVED WITH CONDITIONS** — not a further rejection — since nothing found this phase suggests the underlying application itself is unfit for a small (≤5 user) founder pilot once it actually exists somewhere real.

## Conditions required before re-attempting a PRODUCTION PILOT verdict

| # | Condition | Severity | Direct evidence | Owner | Exact closure requirement |
|---|---|---|---|---|---|
| 1 | Rotate the exposed `FINNHUB_API_KEY`/`OPENAI_API_KEY` | Critical | `git show 7676e23:frontend/.env` / `git show 5d855ea:frontend/.env` — real key values, confirmed present in history now on GitHub | Repository operator | Revoke both keys in their respective dashboards, issue new values, confirm new values exist only in untracked `.env` files. Re-verify by confirming the old values no longer authenticate. |
| 2 | Stand up a real production deployment | Critical | Zero hosting config files anywhere; `DEPLOYED_ENVIRONMENT_MATRIX.md` — every variable "not yet provisioned" | Repository operator | Complete `PRODUCTION_DEPLOYMENT_RESULT.md`'s operator checklist in full: hosting platform, real Postgres, real `JWT_SECRET`/`ADMIN_API_KEY`, real `CORS_ALLOWED_ORIGINS`/`VITE_API_BASE_URL`, deploy both frontend and backend. |
| 3 | Fix or disclose the Recommendations-screen templating defect | High | Live-confirmed byte-identical "Would prove it wrong"/"What would change my mind"/"Watch next" text across GOOGL/NVDA/MSFT this phase | AI/analytics engineering | Apply real per-symbol differentiation to the Recommendations engine's counterargument/invalidation/watch-next generation, matching the pattern already proven in `impactIntelligenceService.js`. Verify via a fresh live capture of ≥3 same-sector recommendations. |
| 4 | Fix or disclose the Daily-Feed Fed-rate-hike/FOMC-decision scoring duplication | High | Live-confirmed identical Importance/Confidence/Attention-score/affected-holdings for two distinct headlines this phase | AI/analytics engineering | Extend the same per-event differentiation already applied to the "AAPL earnings"/"Earnings calendar concentration" pair to this pair (and any other same-category events with no named ticker). Verify via a fresh live capture. |
| 5 | Resolve or clearly gate the Guest-session functional gaps | High | Live-confirmed console errors for notifications/price alerts under the default Guest session this phase | Frontend/backend | Either make these features work for Guest sessions with an honest scoped experience, or replace the raw error with an explicit "sign up with an invite code" message. |

No code was modified and nothing was committed during this verification phase, per explicit mission instruction.
