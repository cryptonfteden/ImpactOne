# Production Build Fix Plan

**Phase:** BUILD-STABILITY-001
**Status:** This is a plan only. No implementation, no code changes, and no commits were made as part of this phase — every action below is a recommendation for a future implementation phase to execute and verify.

This plan sequences the fixes for the findings in [BUILD_HEALTH_REPORT.md](../archive/audits/BUILD_HEALTH_REPORT.md). Ranked by severity, in the order they should be executed — several later items are only meaningful once earlier ones are in place.

---

## Step 1 — Restore a working, reproducible build (CRITICAL, do first)

The build must be fixed and made reproducible together, not separately — fixing the immediate CSS error without also pinning versions only guarantees the same class of failure recurs on the next `npm install`.

1. **Pin exact versions for every build-critical dependency** in `frontend/package.json`: `vite`, `@vitejs/plugin-react`, `react`, `react-dom` should all move from `"latest"` to a specific, tested version (exact version or a narrow, intentional range — not an open `"latest"` tag). This is the single highest-leverage fix: it converts "the build might break on any install" into "the build behaves identically until someone deliberately upgrades it."
2. **Resolve the lightningcss minification failure directly**, most likely via one of:
   - Downgrading to a Vite major version confirmed compatible with this project's CSS (a version prior to the one that introduced the current default CSS-minification pipeline), or
   - Adding a `vite.config.js` that explicitly sets `build.cssMinify` to a known-working minifier (e.g. `'esbuild'`) as an interim, explicit choice rather than an implicit framework default, or
   - Upgrading `lightningcss` to a version with a confirmed fix for this parsing failure, if one exists upstream.
   Whichever path is chosen, the fix must be verified by actually running `npm run build` to completion and inspecting the produced `dist/` output — not just re-reading the CSS source and assuming it's fine, since the earlier investigation already showed every source file is individually valid.
3. **Add a `vite.config.js`** even if its initial content is minimal. Right now the project has no control surface over its own bundler defaults at all; a config file (however small) is what makes every future decision like step 2 explicit and reviewable instead of implicit and silent.
4. **Pin the Node.js version** the project is built and deployed with (an `.nvmrc` and/or an `engines` field in both `package.json` files). This closes the other half of the reproducibility gap alongside dependency pinning.
5. **Verify the fix** by deleting `node_modules` and `package-lock.json`, reinstalling from a clean state, and running `npm run build` again — a fix that only works with an already-populated `node_modules` has not actually been verified.

## Step 2 — Put an automated gate in place so this can't happen silently again (CRITICAL)

Once the build itself works and is pinned, the far more important fix is making sure a broken build can never again sit undetected in the repository the way this one did (found only by a manual audit, with no way to know how long it had been broken).

1. Add a CI pipeline (e.g. GitHub Actions, since the repo is hosted in a way that supports it) that, on every push and every pull request, at minimum:
   - Installs dependencies from the lockfile (`npm ci`, not `npm install`, so CI always uses the exact pinned/locked versions).
   - Runs `npm run build` and fails the pipeline if it does not complete successfully.
   - Runs the existing test suites (`npm run test:backend`, `npm run test:frontend`) and fails on any test failure.
2. This single pipeline, even before anything else in this plan, converts "someone might notice the build is broken eventually" into "no change can merge while the build is broken" — the highest-leverage single change available.

## Step 3 — Close the static-analysis gaps (HIGH)

With a working, gated build in place, add the checks that catch problems before they ever reach a build attempt:

1. **ESLint**, configured for the actual stack in use (React + JSX, plus the plain Node.js backend), added to the CI pipeline from step 2 as a required check.
2. **A formatter (Prettier or equivalent)**, configured and, ideally, enforced in CI (a formatting-check step, not just an editor setting) so style discussions don't consume review time.
3. **Resolve the dead TypeScript dependency** one of two ways: either remove it if there is no near-term plan to adopt TypeScript, or commit to a real adoption path (a `tsconfig.json` in at least `checkJs`/`allowJs` mode against the existing `.jsx` files, so it starts providing real type-checking value instead of sitting unused). Leaving it installed-but-inert should not continue by default.

## Step 4 — Round out the pipeline (MEDIUM / lower urgency)

These matter for long-term health but do not block anything above:

1. Add a documented rollback procedure for a bad production deploy (referenced by [IMPACTONE_RELEASE_GATES.md](IMPACTONE_RELEASE_GATES.md)'s GA Gate, which already assumes one exists).
2. Consider dependency vulnerability scanning (e.g. `npm audit` as a non-blocking CI report initially, promoted to blocking once triaged).
3. Consider a bundle-size budget check in CI now that a working, minified production build exists to measure.

---

## What "done" looks like for this plan

- A fresh clone of the repository, with no local caches, running `npm ci && npm run build` succeeds every time, not just once.
- That same sequence is what CI actually runs on every push — not a close approximation of it.
- The dependency versions that make the build succeed are visible and pinned in `package.json`/lockfile, not implicit in whatever happened to be "latest" on the day it last worked.
- A broken build, a failing test, or a lint violation cannot be merged to `main` without an explicit, visible override — not because no one happened to run the check locally.

This plan intentionally stops at "what to do and in what order" — execution, verification of the actual fix, and any resulting code or config changes belong to a future implementation phase, not this one.
