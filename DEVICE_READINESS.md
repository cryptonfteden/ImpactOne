# DEVICE_READINESS.md — Phase APP-STORE-QUALITY-001

Per-focus-area checklist, each item backed by a live or static verification performed this phase (not assumed from memory). Status legend: ✅ verified good · 🔧 fixed this phase · ⚠️ disclosed limitation (not fixed, reason given) · ❓ not independently testable in this environment.

## Safe areas

| Item | Status | Evidence |
|---|---|---|
| Header top padding respects notch (`padding-top: calc(16px + env(safe-area-inset-top))`) | ✅ | `styles.css` line ~2893, confirmed present |
| Bottom nav respects home-indicator (`padding-bottom: ... + env(safe-area-inset-bottom)`) | ✅ | `styles.css` line ~2927/2968 |
| Feedback widget respects bottom-nav strip | 🔧 | F1 in `APP_STORE_QUALITY.md` — was dead code due to CSS cascade order, now actually applies |
| Flagship/3D Workspace toolbar respects notch in landscape | 🔧 | F3 — added `env(safe-area-inset-top/left)` fallback-safe insets |
| Real physical notch/Dynamic Island occlusion | ❓ | Chromium does not emulate non-zero safe-area-inset values; cannot be produced in this environment |

## Device rotation

| Item | Status | Evidence |
|---|---|---|
| Bottom nav renders in landscape (844x390) | ✅ | Live: `nav` rect 828.8x48.8, visible, `display:none` sidebar |
| Header stays a single row in landscape (no vertical stacking) | ✅ | Live: `flexDirection: row` confirmed under `matchMedia('(orientation:landscape) and (max-height:500px)')` |
| Live rotation without reload (portrait→landscape→portrait) | ✅ | Zero horizontal overflow in either direction, nav stayed correctly sized throughout |
| Manifest doesn't lock orientation for installed app | 🔧 | F4 — removed stale `"orientation": "portrait-primary"` (a Sprint-33-era workaround for the since-fixed landscape-nav bug) |

## Touch ergonomics

| Item | Status | Evidence |
|---|---|---|
| Bottom nav tap targets | ✅ | 73x48px, exceeds 44x44 minimum |
| Header icon buttons (alerts/notifications/quick-actions/account) | 🔧 | Measured 38x38px visual (below 44x44); real tappable area now enlarged via invisible `::after` hit-slop to ~44x44 without changing the visual/layout size |
| Feedback widget overlapping/blocking a nav tab | 🔧 | F1 — real `page.click()` failure reproduced and fixed |
| Search "Go" button | ✅ | 46x36px — acceptable, not blocking any adjacent control |

## Font scaling

| Item | Status | Evidence |
|---|---|---|
| Pinch-zoom / accessibility zoom not blocked | ✅ | No `maximum-scale`/`user-scalable=no` in viewport meta |
| No `text-size-adjust` override defeating OS "larger text" | ✅ | Grepped, zero matches anywhere in the app's CSS |
| No fixed `html`/`:root` `font-size` override | ✅ | Grepped, none found — default 100% (16px) baseline preserved |
| Reflow under 200% root font-size (simulated large-text) | ✅ | Live test on Home at 390px: zero horizontal overflow |

## Accessibility

| Item | Status | Evidence |
|---|---|---|
| `<html lang="en">` present | ✅ | `index.html` |
| ARIA landmarks (banner/navigation/dialog) present and correctly labeled | ✅ | Confirmed live via accessibility snapshot (banner, `nav[aria-label="Primary navigation"]`, `dialog` for onboarding) |
| Keyboard focus ring unified across NOVA + 3D/Flagship layers | ✅ | Already fixed in WORLD-CLASS-FINISH-001 (re-confirmed present, not re-touched this phase) |
| `prefers-reduced-motion` respected | ✅ | Emulated live; app loads/renders without error, no motion-dependent crash |
| Full contrast/WCAG audit | ⚠️ | Out of scope for this phase (already extensively covered in the NOVA Foundation/Design Perfection arc); not re-audited from scratch here |

## Animations on mobile

| Item | Status | Evidence |
|---|---|---|
| `prefers-reduced-motion: reduce` — app functions correctly | ✅ | Live emulation test, no error |
| 3D scene render loop pauses when tab/app backgrounded | ❓ | No explicit `visibilitychange` handling found in `workspace3d`'s `useFrame` usages; relies on the browser's own native rAF throttling for hidden tabs (standard behavior) — not independently reproducible as a real defect in this environment, not fixed |
| No animation-caused layout overflow at mobile widths | ✅ | Confirmed via `scrollWidth === clientWidth` at 390px and 844x390 |

## Startup experience / splash quality

| Item | Status | Evidence |
|---|---|---|
| Branded boot/loading state (not a blank white div) | ✅ | `.boot-loading` ("Loading ImpactOne" + spinner) confirmed rendering during identity/profile resolution |
| First paint background matches app's real background (no white flash) | ✅ | Body's real computed background is dark navy from first paint; manifest `background_color`/`theme_color` (`#06090f`) matches the app's own `--bg-0` token used by the real (cascade-winning) `body` rule |
| iOS native "Add to Home Screen" splash | ❓ | No explicit `apple-touch-startup-image` tags; iOS 11.3+ is documented to synthesize a splash from manifest icons/background_color, which are correct — genuine on-device behavior not verifiable here |

## PWA behavior

| Item | Status | Evidence |
|---|---|---|
| `manifest.json` valid, linked, correct icons (192/512/maskable) | ✅ | Re-validated via `JSON.parse` after edit; icons present in `public/` |
| Service worker installs app shell + hashed build assets | ✅ | `sw.js` reviewed — parses `index.html`'s real asset URLs at install time (handles hashed filenames correctly across builds) |
| API/data requests never served from cache | ✅ | `sw.js`'s `isApiRequest()` explicitly bypasses the cache for `/api/`/`/v2/` — never shows stale financial data as if live |
| Navigation requests: network-first, offline fallback to cached shell | ✅ | Confirmed in `sw.js` |
| Orientation lock removed so installed app rotates like the web tab | 🔧 | F4 |

## Install experience / first launch polish

See `INSTALL_EXPERIENCE.md` for the dedicated deep-dive. Summary: manifest/icons/service-worker are real and correct; onboarding "Welcome to the beta" dialog reconfirmed live on a genuinely cleared-storage session; no install-rich-UI screenshots (recommended, not fabricated).

## Regression / build gate

| Check | Result |
|---|---|
| `npx vitest run` (full frontend suite) | 615/615 passing (baseline was also 615/615 — zero regressions) |
| `npm run build` (production) | Clean, only pre-existing unrelated warnings (`INEFFECTIVE_DYNAMIC_IMPORT`, chunk-size) — identical to the pre-fix baseline |
