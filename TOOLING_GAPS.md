# Tooling Gaps

**Phase:** BUILD-STABILITY-001
**Purpose:** A standing inventory of missing development tooling, in the same Mandatory / Recommended / Nice to have framing used by [IMPACTONE_RELEASE_CHECKLIST.md](IMPACTONE_RELEASE_CHECKLIST.md), so future phases can check progress against a fixed list rather than rediscovering these gaps from scratch. Every absence below was confirmed by direct repository search (config-file search plus `package.json` dependency inspection), not assumed.

---

## ESLint (static analysis)

**Current state: absent entirely.** No `.eslintrc*` or `eslint.config.*` file anywhere in the repository; `eslint` is not a dependency of the root or frontend `package.json`.

- **Mandatory:** A working ESLint configuration covering the frontend (React + JSX) and backend (Node.js/Express) code, wired into CI as a required, blocking check.
- **Recommended:** React-hooks and accessibility-focused lint rules (e.g. rules of hooks, `jsx-a11y`-equivalent checks), given how much of this codebase's own review history has centered on accessibility and hook-driven state.
- **Nice to have:** Editor-integrated auto-fix on save; a pre-commit hook running lint on staged files only (for fast local feedback, separate from the CI-level full-repo check).
- **Blocking issue if unresolved:** none of this is currently release-blocking on its own, but it directly enables classes of bugs (unused variables, unreachable code, incorrect hook dependencies) to reach production undetected — it should be treated as a prerequisite for any of this engagement's future "release-ready" verdicts, not an optional nicety.

## Formatting

**Current state: absent entirely.** No `.prettierrc*` or equivalent config found; no formatting tool is a dependency anywhere in the repo.

- **Mandatory:** A single, repo-wide formatting configuration (Prettier or equivalent) so style is consistent and not subject to per-contributor preference.
- **Recommended:** A CI check that fails if code is not already formatted (not just an editor setting that some contributors may not have enabled).
- **Nice to have:** Format-on-save wired into the repo's editor config recommendations (e.g. a checked-in `.vscode/settings.json` recommendation).
- **Blocking issue if unresolved:** none — this is a consistency/maintainability gap, not a correctness one.

## Type checking

**Current state: effectively absent, despite appearing present.** `typescript` is listed as a devDependency in `frontend/package.json`, but there is no `tsconfig.json` anywhere in the repository and zero `.ts`/`.tsx` files exist (confirmed by file search) — the dependency is installed but nothing in the project ever invokes it for type checking. This is worse than simply not having TypeScript: it creates a false impression, on a quick `package.json` read, that type safety exists when it does not.

- **Mandatory:** A decision, made explicitly rather than by default: either (a) remove the unused `typescript` devDependency if there's no near-term intent to adopt it, or (b) add a real `tsconfig.json` and start applying it — even in the lightweight `checkJs`/`allowJs` mode against existing `.jsx` files, which requires no file renames and would immediately start catching real classes of bugs.
- **Recommended:** If adopting real type checking, add it as a required CI check alongside ESLint, not just a manually-run local command.
- **Nice to have:** A gradual migration path for the most critical shared modules (e.g. the NOVA design-system components, the scoring/claim data-model utilities that many past audits have flagged as needing strict consistency) to real `.ts`/`.tsx` files.
- **Blocking issue if unresolved:** none directly, but the current state (installed, unused, silently implying safety that isn't there) should itself be considered a small trust/honesty issue in the tooling, consistent with this engagement's broader "never imply something works that doesn't" standard.

## Build validation

**Current state: absent entirely.** Nothing in the repository automatically runs `npm run build` on any change. The only way the current, 100%-reproducible build failure (see [BUILD_HEALTH_REPORT.md](BUILD_HEALTH_REPORT.md)) would ever be discovered is a human manually running the command locally — which is exactly how this audit found it, with no way to know how long it had been broken before today.

- **Mandatory:** An automated step (in CI, see below) that runs `npm run build` on every push/PR and fails the pipeline if it does not complete successfully.
- **Recommended:** The same step should also assert on basic output sanity (e.g. `dist/` is non-empty, an `index.html` exists) so a build that "succeeds" but produces a broken or empty bundle is also caught.
- **Nice to have:** A bundle-size budget check once the build is reliably producible, to catch unintentional bloat over time.
- **Blocking issue if unresolved:** this is the single most consequential gap found in this audit — its absence is the direct reason a total, 100%-reproducible build failure was sitting undetected in the repository.

## CI/CD readiness

**Current state: absent entirely.** Confirmed by direct search: no `.github/workflows/`, no `.gitlab-ci.yml`, no `azure-pipelines.yml`, no `.circleci/config.yml`, no `Jenkinsfile`, no `.travis.yml` anywhere in the repository. There is no automated pipeline of any kind.

- **Mandatory:** A CI pipeline that runs on every push and pull request, at minimum executing: dependency install from the lockfile (`npm ci`), the full test suite (`npm run test`), and `npm run build`. Any failure in any of these should block merge.
- **Recommended:** ESLint and formatting checks added to the same pipeline once available (see above); a required-status-check branch protection rule on `main` so the pipeline cannot be bypassed.
- **Nice to have:** Automated deployment (CD) triggered on a successful merge to a release branch, once the above is stable; separate, faster-feedback pipelines for PRs (lint/test/build) versus slower pipelines for full end-to-end verification.
- **Blocking issue if unresolved:** the complete absence of CI is itself the root enabling condition for every other gap in this document — without it, none of the other tools (however well-configured) are actually enforced, only available to run manually and easy to skip under time pressure.

## Related, adjacent gaps found during this audit (worth tracking alongside the above)

- **No Node.js version pinning** anywhere (no `.nvmrc`, no `engines` field in either `package.json`) — compounds the reproducibility problem described in the Build Health Report, since neither the Node runtime nor the key build dependencies (`vite`, `@vitejs/plugin-react`, `react`, `react-dom`, all declared as `"latest"`) are fixed.
- **No `vite.config.js`** — the frontend build runs entirely on framework defaults with no project-level override point, which is part of why a new upstream default (the CSS minifier that is currently failing) was able to silently change this project's build behavior with no code change on this project's side.

---

## How to use this document going forward

This list should be checked, not re-derived, at the start of any future phase that touches build or release-readiness in this engagement. If a gap listed here has since been closed, a future session should verify that directly (config file present, CI pipeline actually green on a real run) before crossing it off — consistent with this engagement's standing discipline of never trusting a claim of "done" without independent verification.
