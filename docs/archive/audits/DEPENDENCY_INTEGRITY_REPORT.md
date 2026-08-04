# Dependency Integrity Report — RC1-BLOCKERS-001

## The Prior State

`RELEASE-CANDIDATE-001` found `react-router-dom` genuinely unused (zero real usage anywhere in `frontend/src`/`backend`; this app uses state-driven screen-swap navigation, not routing) but deliberately did **not** remove it from `package.json`, because the working tree already carried unrelated, pre-existing uncommitted additions (`bcryptjs`, `jsonwebtoken`, `stripe`) from outside that session's phases, and committing the removal would have misattributed those to that phase.

## This Phase's Resolution

**Inspected the exact state**: confirmed via `git show HEAD:package.json` that the last real commit had none of `bcryptjs`/`jsonwebtoken`/`stripe` declared, while the working tree already had them present. Confirmed via direct grep that all three are genuinely required by real, already-committed backend code:

- `bcryptjs` → `backend/services/authService.js`
- `jsonwebtoken` → `backend/services/authService.js`
- `stripe` → `backend/services/billing/providers/stripeBillingProvider.js`

This means the committed backend code has depended on these three packages for a while, with `package.json` simply never updated to declare them — a real, independent dependency-integrity gap the mission explicitly asked to be inspected.

**Preserved all three** (`bcryptjs`, `jsonwebtoken`, `stripe`) exactly as they already were in the working tree — required per this mission's explicit instruction, and confirmed genuinely necessary above.

**Removed `react-router-dom`** — re-verified zero real usage repo-wide (backend and frontend) before removing, per this mission's explicit "only if repo-wide verification confirms it has no real consumers" instruction.

**Verified a fresh install matches committed code's real requirements**:
- Grepped every top-level `require("packagename")` in committed backend code (excluding Node built-ins) and cross-checked against `package.json`'s dependencies — every required package is now declared; none missing.
- Ran `npm install --package-lock-only` to regenerate `package-lock.json`, confirming it now resolves cleanly with `react-router-dom` fully absent (`grep -c react-router-dom package-lock.json` → `0`).
- Ran `npm ls --depth=0`, which surfaced `react-router-dom@7.18.1 extraneous` (physically still in `node_modules` but no longer declared) — the expected, correct state right after removing a declared dependency.
- Ran `npm prune`, which removed the now-extraneous `react-router-dom` and its own transitive dependencies (`react-router`, `cookie`, `set-cookie-parser`) from `node_modules`. A second `npm ls --depth=0` afterward shows a clean tree with zero extraneous packages — `node_modules` now exactly matches what `package.json`/`package-lock.json` declare.

## Attribution (Per This Mission's Explicit Instruction)

This phase's commit includes `bcryptjs`, `jsonwebtoken`, and `stripe` becoming declared in `package.json` for the first time in a commit — those three were **not** added by this phase; they were already present, uncommitted, in the working tree before this phase began (confirmed via `git show HEAD:package.json` showing their absence in the last real commit). This phase's own, attributable change is exclusively the removal of `react-router-dom`. Both facts are disclosed explicitly here and in the commit message, rather than the pre-existing three being silently folded in as if newly added by this work.

## Verification

- `npm ls --depth=0`: clean, zero extraneous packages, all declared dependencies resolved.
- Backend full regression: see commit message for the exact pass count — confirms `authService.js`/`stripeBillingProvider.js` (the real consumers of the three preserved dependencies) continue to pass with no behavior change.
- No secrets were touched or exposed by this dependency work — `.env` remains gitignored and outside this change entirely.
