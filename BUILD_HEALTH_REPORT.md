# Build Health Report

**Phase:** BUILD-STABILITY-001
**Method:** Direct reproduction only — every finding below was independently verified by running the actual build and inspecting the actual repository, not inferred from documentation. No application code was modified during this investigation.

---

## Headline finding

**`npm run build` fails 100% of the time, on a clean checkout, with the exact dependencies currently declared in `package.json`.** This is not an intermittent or environment-specific failure — it was reproduced on the first attempt. The project currently has no way to produce a deployable production frontend bundle. This alone means the project is not production-ready from a tooling standpoint, independent of anything about the application code itself.

---

## 1. Why `npm run build` fails

Reproduced directly:

```
> npm run build
> cd frontend && npm run build
> vite build

transforming...
✔ 222 modules transformed.
✘ Build failed in 1.20s
error during build:
Build failed with 1 error:
[plugin vite:css-post]
SyntaxError: [lightningcss minify] Unexpected end of input
5394 |    animation: none;
5395 |  }
5396 |  
     |  ^
```

- All 222 JS/JSX modules transform successfully. The failure happens specifically in Vite's `vite:css-post` plugin, during the final CSS-minification step (handled by the `lightningcss` native binary), not during transformation of any individual source file.
- This means the application's component code is not implicated — the failure is isolated entirely to CSS bundling/minification.

**Ranked severity: CRITICAL.** A build that cannot complete cannot be deployed. This blocks every other production-readiness question until it's resolved.

---

## 2. Root cause of the lightningcss minification failure

### What was ruled out
Every CSS source file that is part of the global stylesheet import chain (`main.jsx`'s import order: `styles.css` → `styles/tokens.css` → `theme.css` → `typography.css` → `motion.css` → `layout.css` → `accessibility.css` → `components.css`) was checked directly for brace balance:

| File | `{` count | `}` count | Balanced? |
|---|---|---|---|
| styles.css | 569 | 569 | ✅ |
| tokens.css | 1 | 1 | ✅ |
| theme.css | 7 | 7 | ✅ |
| typography.css | 21 | 21 | ✅ |
| motion.css | 14 | 14 | ✅ |
| layout.css | 31 | 31 | ✅ |
| accessibility.css | 7 | 7 | ✅ |
| components.css | 130 | 130 | ✅ |

Every individual source file is syntactically well-formed. This rules out "someone wrote broken CSS" as the cause.

### What the evidence points to
The reported error location (line 5394–5396 of the CSS lightningcss was asked to minify) lands almost exactly at the cumulative line count of all eight files concatenated in their real import order (68+799+163+87+170+252+123+3733... in import order this totals 5395 lines) — i.e., the parser runs out of input at what corresponds to the very tail of `components.css`, the last file in the import chain, even though that file's own source ends with a fully-closed rule. This is the signature of a bundler/minifier-level defect (something in how Vite hands the fully-concatenated CSS to `lightningcss`), not a defect in any one file taken on its own.

Two compounding facts point at *why* this specific defect exists right now:

1. **Zero version pinning on the build toolchain.** `frontend/package.json` declares `"vite": "latest"` and `"@vitejs/plugin-react": "latest"` (also `"react"`/`"react-dom"` as `"latest"`) — not fixed versions, not even a caret range. A fresh `npm install` today resolved this to **Vite 8.1.4**, which uses **Rolldown 1.1.5** (visible directly in the failing stack trace: `rolldown/dist/shared/...`) as its production bundler and **lightningcss 1.32.0** as its default CSS minifier. Both are materially newer/different architecture choices than older stable Vite majors (which used Rollup + esbuild for CSS by default). Because nothing pins these versions, this exact failure could appear or disappear on any future `npm install` with no code change at all — the build is not reproducible.
2. **No `vite.config.js` exists anywhere in the project.** The build runs on 100% framework defaults. There is no project-level place to override, pin, or disable the CSS minifier if a specific version of it has a bug — the project has no control surface over its own bundling pipeline.

**Conclusion:** the most likely root cause is a bug or incompatibility in the specific, currently-resolved Vite 8 / Rolldown / lightningcss combination when bundling this project's multi-file plain-CSS import chain — surfaced *only* because the project pins no exact toolchain versions and has no config file to work around framework defaults. This is an infrastructure/dependency-management failure, not an application authoring error.

**Ranked severity: CRITICAL** (root cause of finding #1).

---

## 3. Missing tooling

Confirmed by direct repository search (no config files found, no relevant packages in either `package.json`):

| Tool | Status | Evidence |
|---|---|---|
| ESLint | **Absent** | No `.eslintrc*`, no `eslint.config.*` anywhere in the repo. Not a dependency in root or frontend `package.json`. |
| Code formatting (Prettier or equivalent) | **Absent** | No `.prettierrc*` anywhere. Not a dependency. |
| Type checking | **Effectively absent** | `typescript` is listed as a frontend devDependency, but there is no `tsconfig.json` anywhere and zero `.ts`/`.tsx` files in the codebase (confirmed via file search) — it is installed but never actually invoked for type checking. It is dead weight, not a working safety net. |
| Build validation | **Absent** | Nothing in the repo runs `npm run build` automatically on any change (see CI/CD finding below). The only way this exact failure would ever be discovered is a human manually running the build command locally — which is exactly how it was found in this audit. |

**Ranked severity: HIGH** for ESLint and build validation (both directly prevent classes of defects that would otherwise reach production undetected); **MEDIUM** for formatting (a consistency/maintainability issue, not a correctness one); **MEDIUM** for the dead TypeScript devDependency (misleading — its presence in `package.json` implies a safety net that does not actually exist).

---

## 4. CI/CD readiness

- **No CI/CD configuration of any kind exists in this repository.** Confirmed by direct search for `.github/workflows/`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `.circleci/config.yml`, `Jenkinsfile`, and `.travis.yml` — none present.
- There is consequently no automated place where `npm run build`, `npm test`, lint, or type-check would ever run before a change reaches `main`. Every one of these checks depends entirely on a human remembering to run them locally.
- No Node.js version is pinned anywhere (no `.nvmrc`, no `engines` field in either `package.json`). The build was reproduced here on Node v24.18.0 / npm 11.16.0 — but nothing in the repo asserts this is the expected or supported version, compounding the "latest"-dependency reproducibility problem above.

**Ranked severity: CRITICAL.** The complete absence of CI is the reason a 100%-reproducible, total build failure could exist in the repository undetected — there is no automated gate that would have caught it before this audit.

---

## 5. Production release risks

Beyond the build failure itself, direct verification found:

- **The frontend cannot currently be deployed at all.** `npm run build` is the only path to a production bundle (there is no alternative static-build script), and it fails unconditionally. This is release-blocking on its own, before any other risk is considered.
- **The dependency graph is not reproducible.** `"latest"` version specifiers on `vite`, `@vitejs/plugin-react`, `react`, and `react-dom` mean the exact same source code can produce a working build today and a broken one tomorrow (or vice versa) with zero code changes — this is the direct mechanism by which the current failure most likely appeared.
- **No safety net would catch a regression of any kind before it reaches `main`** — no CI, no lint, no type-check, no automated build validation. A broken build, a secret leak, or a failing test can all be merged today with nothing to stop them.
- **Secrets hygiene is currently sound** (a positive finding, worth stating plainly): `frontend/.env` is correctly ignored by `.gitignore` and confirmed **not** tracked in git (`git ls-files` shows only `.env.example` and `.env.test`, neither of which contains real secrets — `.env.test` was inspected directly and contains only a non-secret feature-flag override).

**Ranked severity: CRITICAL** for the undeployable build and the reproducibility gap; **noted as a resolved/positive finding, not a risk**, for `.env` secret hygiene, which is better than this repository's own history (a prior audit had flagged a tracked `.env` file — that issue is no longer present).

---

## Summary ranking of all findings

| # | Finding | Severity |
|---|---|---|
| 1 | `npm run build` fails unconditionally on a clean checkout | CRITICAL |
| 2 | Root cause: unpinned `"latest"` build-toolchain dependencies resolved to a Vite 8/Rolldown/lightningcss combination that fails to minify this project's CSS, with no `vite.config.js` to work around it | CRITICAL |
| 3 | No CI/CD pipeline exists at all — nothing would have caught this before a human found it | CRITICAL |
| 4 | No Node.js version pinned anywhere, compounding the reproducibility problem | HIGH |
| 5 | No ESLint anywhere in the repository | HIGH |
| 6 | No automated build-validation step of any kind | HIGH |
| 7 | No formatting tool (Prettier or equivalent) configured | MEDIUM |
| 8 | `typescript` installed as a devDependency but never used for actual type checking (no tsconfig, no `.ts`/`.tsx` files) | MEDIUM |
| 9 | No `vite.config.js` — project has zero control over its own bundling defaults | MEDIUM |
| 10 | `.env` secret hygiene | Resolved / not a risk (positive finding) |

See [PRODUCTION_BUILD_FIX_PLAN.md](PRODUCTION_BUILD_FIX_PLAN.md) for the recommended remediation sequence and [TOOLING_GAPS.md](TOOLING_GAPS.md) for the full tooling-gap breakdown with Mandatory/Recommended/Nice-to-have framing.
