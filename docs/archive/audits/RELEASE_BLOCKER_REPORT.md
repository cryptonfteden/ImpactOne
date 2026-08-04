# Release Blocker Report

**Phase:** RELEASE-BLOCKER-001
**Mission:** Resolve every production build blocker. `npm run build` had failed unconditionally since it was first flagged (`BUILD_HEALTH_REPORT.md`, `PRODUCTION_BUILD_FIX_PLAN.md`, `TOOLING_GAPS.md`), reconfirmed as pre-existing and out of scope at the end of every frontend phase this entire engagement. This phase makes it pass.

## Result

**`npm run build` now succeeds. Zero build errors.**

```
vite v8.1.4 building client environment for production...
✓ 243 modules transformed.
dist/index.html                                      1.74 kB │ gzip:   0.82 kB
dist/assets/index-Bzq1Nl0o.css                      78.53 kB │ gzip:  15.06 kB
dist/assets/GlobalIntelligenceFeature-MCXiXLrd.js    7.35 kB │ gzip:   2.11 kB
dist/assets/index-Br3Ysj_V.js                      545.25 kB │ gzip: 145.38 kB
✓ built in 1.67s
```

The only remaining output is two advisory warnings (`INEFFECTIVE_DYNAMIC_IMPORT`, a >500 kB chunk-size notice) — non-fatal, don't affect the build's exit code, and fixing them would mean restructuring import graphs and code-splitting, which is a real product/architecture change outside this phase's explicit "do not modify product behavior" constraint.

## Root cause, actually found

Every prior phase's investigation stopped at "unpinned `latest` Vite/Rolldown/lightningcss dependencies," which is real but incomplete — it explains *why the failure mode was possible*, not *why the build actually failed*. This phase went one level deeper.

The literal build error was:

```
[plugin vite:css-post]
SyntaxError: [lightningcss minify] Unexpected end of input
5410 |    animation: none;
5411 |  }
5412 |
     |  ^
```

That pointed at the *end* of the fully concatenated production CSS bundle — a classic symptom of an unclosed construct somewhere earlier in the file, not a problem with the code at the reported line. Checking every source stylesheet's comment-delimiter balance (`/*` vs `*/` counts) found the actual defect in `frontend/src/styles/theme.css`:

```css
/*
 * ...
 * component that already references a --nova-color-*/--nova-surface-*
 * ...
 */
```

The file-header comment opened on line 1 is **prematurely closed by a literal `*/` inside its own descriptive text** on line 9 (`--nova-color-*/--nova-surface-*` — the `*/` in the middle of that token sequence is a valid comment-close token to any CSS parser). Everything from that point to the *real* intended closer on line 27 is then parsed as live CSS, desynchronizing the rest of the file's comment/rule structure. Vite's default dev-mode pipeline (unminified, more permissive) tolerated the resulting mess silently; Vite 8's production default CSS minifier, `lightningcss`, has a stricter parser that throws once the desync reaches end-of-file across the whole bundle.

**Fix:** one-line edit, adding a space so the comment closes only where intended:

```diff
- * component that already references a --nova-color-*/--nova-surface-*
+ * component that already references a --nova-color-* / --nova-surface-*
```

This is a change to comment *text* only — it has zero effect on any actual CSS rule, class, or rendered pixel. Verified: `theme.css`'s `/*`/`*/` counts are now both 11 (were 11/12 before the fix).

## What was done, in mission order

1. **Fix `npm run build`.** Root-caused and fixed as above. An intermediate attempt (routing around the bug via `build: { cssMinify: "esbuild" }` in `vite.config.js`) was tried first, but Vite 8's rolldown-based bundler doesn't ship `esbuild` as a dependency for CSS minification, so that path itself failed (`Cannot find package 'esbuild'`) — this is exactly why the real fix (removing the underlying CSS defect) was pursued instead of a tooling workaround. `vite.config.js` no longer overrides `cssMinify` at all — it uses Vite's real default (`lightningcss`), which now works correctly against valid CSS.

2. **Pin all dependencies.** `frontend/package.json`'s four `"latest"` dependency entries (`@vitejs/plugin-react`, `react`, `react-dom`, `vite`) and three `"latest"` devDependency entries (`@types/react`, `@types/react-dom`, `typescript`) are now pinned to their exact, currently-installed, already-tested versions (`6.0.3`, `19.2.7`, `19.2.7`, `8.1.4`, `19.2.17`, `19.2.3`, `7.0.2`). The two devDependencies that already carried a `^` range (`@testing-library/jest-dom`, `@testing-library/react`, `jsdom`, `vitest`) are also tightened to exact pins for full determinism. `package-lock.json` was regenerated via `npm install` and now reflects every exact pin — confirmed via diff: the resolved package tree itself is unchanged (every already-installed version stays exactly as it was), only the version *constraints* became exact instead of `latest`/`^`.

3. **Add `vite.config.js`.** Added at `frontend/vite.config.js` — previously absent entirely, meaning every Vite default (including which CSS minifier runs) was implicit and unversioned in the codebase itself. Now explicit: `{ plugins: [react()] }`, using Vite's real default CSS minifier now that the underlying CSS defect is fixed, rather than a workaround.

4. **Remove the lightningcss failure.** Fixed at the actual source (see Root cause above) rather than disabled or routed around — `lightningcss` still runs as the production CSS minifier, and runs successfully.

5. **Verify production build succeeds.** Confirmed three ways: (a) `npm run build` exits cleanly with the output above; (b) `npm run preview` served the built `dist/` output, and a Playwright check against it loaded the real app (title "ImpactOne", real body content, the real onboarding "Welcome to the Beta" overlay rendering with fully-styled CSS) with no new console errors beyond the same pre-existing, unrelated beta-identity-required warnings every other phase's live checks have also seen in a fresh session; (c) `npm run dev` still starts and serves correctly (confirms the new `vite.config.js` didn't regress dev-mode).

6. **Do not modify product behavior.** The only source change beyond dependency-pinning and config is the one-character-effective comment-text fix in `theme.css` (comment text is never rendered or evaluated) — no component, no CSS rule, no JS logic changed.

## Tests

Full suite re-run after every change in this phase: **555/555 passing**, 70 test files — identical to the last confirmed count before this phase, confirming zero behavioral regression from the dependency pins, the `vite.config.js` addition, or the `theme.css` comment fix.

## Known remaining, explicitly out of scope

- The two build-time advisory warnings (`INEFFECTIVE_DYNAMIC_IMPORT`, chunk-size >500 kB) are real, disclosed, non-blocking, and would require actual import-graph/code-splitting changes to resolve — a product/architecture change, not a "fix the build" change, so left untouched per this phase's "do not modify product behavior" constraint.
- `npm audit`'s one high-severity advisory (pre-existing, unrelated to this phase's dependency pins — the audit output is unchanged before/after this phase's `npm install`) was not addressed; resolving it may require a version bump this phase's scope doesn't cover, and it was never named in this phase's mission.
- No ESLint config exists in this repo (noted in every prior phase); still true, still out of scope here.
