# Engineering Foundation Roadmap

**Phase:** ENGINEERING-FOUNDATION-001
**Status:** Planning only. Nothing in this document has been implemented; no code, configuration, or dependency files were changed to produce it. It builds directly on the verified findings in [BUILD_HEALTH_REPORT.md](../archive/audits/BUILD_HEALTH_REPORT.md), [PRODUCTION_BUILD_FIX_PLAN.md](../operations/PRODUCTION_BUILD_FIX_PLAN.md), and [TOOLING_GAPS.md](../engineering/TOOLING_GAPS.md) — this roadmap sequences and estimates that already-diagnosed work rather than re-investigating it.

**How priority is assigned:** by engineering impact — how much of the rest of the engineering system depends on an item being fixed, not by how much effort it takes. Several CRITICAL items below are small amounts of work; several MEDIUM/LOW items are larger. Impact and effort are tracked separately for exactly that reason.

---

## 1. Dependency pinning

**Priority:** CRITICAL
**Estimated effort:** Small (well under a day of hands-on work; most of the time is verification, not editing)
**Risks:**
- Pinning to an exact version could pin to whatever the *currently broken* resolution happens to be if done carelessly — pinning must be paired with item 3 (lightningcss remediation), not done blindly.
- Some transitive dependencies may have their own loose ranges; pinning the direct dependencies doesn't fully guarantee reproducibility without a committed lockfile discipline (see item 8, Version Policy).
**Dependencies:** None — this can start immediately and should be the very first change made.
**Recommended execution order position:** 1st (alongside item 3; they should land together).

`frontend/package.json` currently declares `vite`, `@vitejs/plugin-react`, `react`, and `react-dom` all as the literal string `"latest"` — not a version, not even a caret range. This is the direct, confirmed mechanism by which the project's build broke with zero code changes (a routine `npm install` silently resolved to a new Vite major version with a different CSS-minification pipeline). Every one of these should move to an exact, tested version. This is the single highest-leverage, lowest-effort item on this roadmap — it converts "the build might break on any install" into "the build behaves identically until someone deliberately upgrades it," and every other item on this list is easier to reason about once it's done.

---

## 2. Vite configuration

**Priority:** CRITICAL
**Estimated effort:** Small (a minimal, explicit `vite.config.js` is a small amount of code; most effort is deciding what to make explicit vs. leave default)
**Risks:**
- A config file that's too clever (overriding many defaults at once) makes future upgrades harder to reason about — the goal is an explicit, minimal, well-commented set of overrides, not a wholesale reimplementation of Vite's defaults.
- Without care, a new config file could itself introduce a regression if not verified against a real build.
**Dependencies:** Best done together with item 1 (pinning) and immediately before item 3 (the CSS fix needs somewhere to live).
**Recommended execution order position:** 1st, alongside item 1.

No `vite.config.js` exists anywhere in the repository today — the project runs entirely on framework defaults, with zero project-level control over its own bundling behavior. This is precisely why a new upstream default (the CSS minifier that is currently failing) was able to change this project's build behavior silently. Adding even a small, explicit config file — starting with the CSS-minifier override needed for item 3 — gives the project a real, reviewable place to make bundler decisions on purpose instead of by accident.

---

## 3. lightningcss remediation

**Priority:** CRITICAL
**Estimated effort:** Small to Medium (the fix itself is likely small — a config change or a targeted version change — but verifying it thoroughly, including a clean-install test, takes real time)
**Risks:**
- The root cause was diagnosed as a toolchain-level defect (all 8 CSS source files were individually verified brace-balanced; the failure originates in how the concatenated bundle is handed to the minifier), not an application CSS-authoring mistake — so the fix belongs in the toolchain, not in rewriting CSS. A future implementer should resist the temptation to "fix" the CSS files themselves; that would treat a symptom, not the cause, and could mask the same defect from resurfacing on the next dependency bump.
- Whichever fix is chosen (downgrade Vite, switch the CSS minifier to esbuild via config, or upgrade lightningcss) needs to be verified against a genuinely clean install (`node_modules` and lockfile removed and reinstalled), not just the currently-populated local environment — a fix that "works" only because of stale cached state is not actually fixed.
**Dependencies:** Depends on item 2 (needs a `vite.config.js` to carry the fix, if the fix is a config-level override) and should land together with item 1.
**Recommended execution order position:** 1st, immediately alongside items 1–2 — this is the actual build-breaking defect and restoring a working build is the precondition for every other item on this roadmap having anything to verify against.

This is the specific, currently-reproducible failure: `npm run build` fails 100% of the time with `[lightningcss minify] Unexpected end of input`. Three candidate fixes were identified in the prior fix plan (pin Vite to a known-good major version; explicitly set `build.cssMinify` to a known-working minifier such as esbuild via the new config file; or upgrade `lightningcss` if an upstream fix exists) — selecting and verifying one of these is this item's entire scope.

---

## 4. Build verification

**Priority:** HIGH
**Estimated effort:** Small (a single verification script/step; the effort is mostly in deciding what "verified" means, not writing code)
**Risks:**
- A shallow check (e.g., "the build command exited 0") can miss a build that "succeeds" but produces an empty or broken `dist/` — verification needs to assert on real output, not just exit code.
- If this step isn't wired into CI (item 6) immediately, it only protects against regressions when someone remembers to run it manually — exactly the condition that allowed the current failure to go undetected.
**Dependencies:** Depends on items 1–3 being complete (there must be a working build to verify); feeds directly into item 6.
**Recommended execution order position:** 2nd, immediately after the build is restored — before CI is stood up, so the CI pipeline (item 6) has a known-good check to run from day one rather than being built against a still-broken build.

Right now nothing in the repository ever confirms the build actually works — the current failure was only found by a manual audit, with no way to know how long it had been broken. This item defines and locks in what "the build works" concretely means (build completes, `dist/` is non-empty, a real `index.html` exists, and ideally a smoke check that the built app boots) so it can be reused verbatim as a CI gate.

---

## 5. ESLint adoption

**Priority:** HIGH
**Estimated effort:** Medium (initial setup is small; the larger cost is triaging and fixing whatever the first full-repo lint run surfaces across a codebase of this size, which has never been linted before)
**Risks:**
- The very first lint run against an unlinted, sizeable codebase will likely surface a large number of pre-existing findings — this should be expected and budgeted for, not treated as a sign the tool is misconfigured.
- Turning every rule on as blocking from day one risks a large, disruptive first pass; a staged approach (start with a conservative rule set as blocking, treat the rest as warnings to burn down over time) reduces risk without giving up the eventual goal.
**Dependencies:** Independent of items 1–4 (can start in parallel), but should land in CI (item 6) as soon as both exist so it's enforced, not optional.
**Recommended execution order position:** 3rd — can start in parallel with items 1–4, but its CI enforcement should wait until item 6 exists.

No ESLint configuration exists anywhere in the repository today, for either the React/JSX frontend or the Node.js/Express backend. This item covers choosing and configuring a rule set appropriate to both, running it once repo-wide to establish a baseline, and deciding which findings are must-fix-now versus tracked-and-scheduled.

---

## 6. Prettier adoption

**Priority:** MEDIUM
**Estimated effort:** Small (initial setup and a one-time repo-wide reformat is quick; the only real cost is the size of the resulting one-time diff, which touches many files at once)
**Risks:**
- A repo-wide reformat produces a large, noisy diff that can obscure genuine code review for anything else landing around the same time — best done as its own isolated change, merged when no other large change is mid-flight.
- Without a CI-level enforcement step, formatting will drift again almost immediately — the tool alone doesn't guarantee consistency, the enforced check does.
**Dependencies:** Best sequenced after ESLint (item 5) is in place, since some lint rules and formatting rules can conflict if configured independently; should also land in CI (item 6).
**Recommended execution order position:** 4th, shortly after ESLint.

No formatting tool is configured anywhere in the repository. This is the lowest-impact item on this roadmap relative to the others (it affects consistency and review friction, not correctness or reliability), which is why it's ranked MEDIUM rather than HIGH despite being cheap to add.

---

## 7. CI/CD pipeline

**Priority:** CRITICAL
**Estimated effort:** Medium (a minimal pipeline — install, build, test — is a small amount of configuration; growing it to include lint/format and branch protection takes iterative follow-up)
**Risks:**
- Standing up CI against a currently-broken build (before items 1–4 land) would just create a pipeline that's red from day one and easy to start ignoring — sequencing matters here more than almost anywhere else on this roadmap.
- A pipeline without branch-protection enforcement (i.e., checks that can be bypassed) provides false confidence — the mandatory step is making the checks required, not just present.
**Dependencies:** Hard dependency on items 1–4 (a working, verifiable build must exist first). Soft dependency on items 5–6 (can be added to the same pipeline once ready, rather than waiting for them).
**Recommended execution order position:** 5th — right after the build is restored and verifiable, before anything else is allowed to be considered "done," since this is what prevents every future regression of this kind from going undetected the way this one did.

No CI/CD configuration of any kind exists in this repository today (confirmed: no GitHub Actions, GitLab CI, CircleCI, Jenkins, Azure Pipelines, or Travis config anywhere). This is arguably the single most consequential gap on this entire roadmap: its absence is the reason a total, 100%-reproducible build failure could sit undetected in the repository with nothing to catch it. The minimal first version should run on every push and pull request: install from the lockfile (`npm ci`, not `npm install`), run the full test suite, and run the build — failing the pipeline on any of the three.

---

## 8. Version policy

**Priority:** HIGH
**Estimated effort:** Small (this is primarily a documentation and process decision, not an engineering build — deciding and writing down the rules)
**Risks:**
- A policy that exists only as a document, with nothing enforcing it, will drift the same way the current unpinned dependencies did — it needs to be paired with the actual pinning (item 1) and ideally an automated check (e.g., CI failing if a `package.json` dependency uses a `latest`/unpinned range) to have teeth.
- Being too rigid (never allowing any upgrade) is its own risk — the policy should define a deliberate upgrade *process*, not a permanent freeze.
**Dependencies:** Builds directly on item 1 (pinning) having already happened — the policy formalizes and sustains that practice going forward.
**Recommended execution order position:** 6th — right after pinning lands, so the policy reflects a real, already-restored baseline rather than being written in the abstract.

This item is the answer to "how do we make sure this doesn't happen again in six months." It should define: which dependencies must be exact-pinned versus allowed a narrow range, how and how often upgrades are evaluated (e.g., scheduled, deliberate upgrade windows rather than ad hoc), and what verification (build + full test suite, at minimum) is required before any version bump is merged.

---

## 9. Environment management

**Priority:** HIGH
**Estimated effort:** Small (Node version pinning via `.nvmrc`/`engines`, plus documenting `.env` conventions, is a small, mostly-declarative amount of work)
**Risks:**
- Pinning Node without also pinning it in CI (item 7) only solves half the problem — local and CI environments need to agree.
- `.env` conventions need to stay consistent with the one positive finding already confirmed in this audit (the real `frontend/.env` is correctly untracked and gitignored, while `.env.example`/`.env.test` are intentionally tracked and contain no secrets) — this item should preserve that pattern explicitly rather than accidentally loosen it while making other changes.
**Dependencies:** Independent of most other items; can proceed in parallel with items 5–6.
**Recommended execution order position:** 6th, alongside item 8.

No Node.js version is pinned anywhere in the repository (no `.nvmrc`, no `engines` field in either `package.json`) — this compounds the reproducibility gap identified in item 1, since neither the runtime nor the key build dependencies were fixed. This item also covers documenting the project's environment-variable conventions (what belongs in `.env.example` versus a real, untracked `.env`, and the existing, correctly-untracked status of the real one) so the current good practice is written down and not just accidentally true today.

---

## 10. Release automation

**Priority:** MEDIUM
**Estimated effort:** Large (the full scope — automated deployment triggers, versioning/changelog generation, rollback tooling — is the biggest single item on this roadmap; it should be scoped incrementally rather than attempted as one change)
**Risks:**
- Automating deployment before the foundation above is solid (working build, CI gate, lint/format, version policy) would automate shipping broken states faster, not safer — this item is explicitly last for that reason.
- Rollback tooling is only as good as its last real test — a rollback procedure that has never been exercised should not be trusted simply because it's documented.
**Dependencies:** Hard dependency on items 1–7 being complete and stable; soft dependency on item 8 (a version policy) since release automation needs a clear versioning scheme to build on.
**Recommended execution order position:** 7th and last — nothing here should begin until the rest of the roadmap is in place and has been running cleanly for a real observation period, consistent with the GA Gate discipline already defined in [IMPACTONE_RELEASE_GATES.md](../operations/IMPACTONE_RELEASE_GATES.md).

This is intentionally the lowest-urgency, highest-effort item. Automated deployment, semantic versioning/changelog generation, and a tested rollback procedure are all genuinely valuable, but none of them are safe to build on top of an engineering foundation that, as of this audit, cannot reliably produce a working build in the first place.

---

## Recommended execution order (summary)

| Order | Item(s) | Why here |
|---|---|---|
| 1 | Dependency pinning (1) + Vite configuration (2) + lightningcss remediation (3) | Restores a working, reproducible build — the precondition for everything else. Land together. |
| 2 | Build verification (4) | Locks in a concrete, reusable definition of "the build works" before CI is built around it. |
| 3 | ESLint adoption (5) | Can start in parallel with 1–4; establish a baseline early since the first run will surface a backlog worth budgeting time for. |
| 4 | Prettier adoption (6) | Follows ESLint to avoid rule conflicts; cheap, do it once ESLint's baseline is settled. |
| 5 | CI/CD pipeline (7) | Must wait until the build is genuinely fixed (1–4) or it launches red from day one; wire in ESLint/Prettier (5–6) as soon as they're ready too. |
| 6 | Version policy (8) + Environment management (9) | Formalizes and sustains the pinning work from step 1; can run alongside step 5. |
| 7 | Release automation (10) | Last, deliberately — only safe to build once the rest of the foundation has been running cleanly for a real observation period. |

## What "stable engineering foundation" means when this roadmap is complete

A fresh clone of the repository, on the pinned Node version, running `npm ci && npm run build` succeeds every time — not just once, not just in this environment. That same sequence, plus the full test suite, plus lint and format checks, is what CI actually runs on every push, and none of it can be bypassed to merge to `main`. Every dependency version in use is a deliberate choice recorded in `package.json`, not whatever happened to be current on the day someone last ran `npm install`. Nothing here requires a human to remember to run a check locally for it to be enforced.
