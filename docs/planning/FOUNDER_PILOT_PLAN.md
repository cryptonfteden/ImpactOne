# FOUNDER_PILOT_PLAN.md — Phase FOUNDER-PILOT-001

**Mission:** design a practical, seven-day, founder-only validation process for ImpactOne installed on a real phone. This document is the plan; [SEVEN_DAY_USAGE_SCRIPT.md](../product/SEVEN_DAY_USAGE_SCRIPT.md) is the day-by-day script; [REAL_DEVICE_FEEDBACK_TEMPLATE.md](../product/REAL_DEVICE_FEEDBACK_TEMPLATE.md) is what gets filled out during use; [FOUNDER_GO_NO_GO.md](../product/FOUNDER_GO_NO_GO.md) is the end-of-week decision gate. **No production code was modified to produce this plan** — it is documentation only, and none of the four deliverables should be read as claiming the pilot has already happened.

---

## 1. Why a founder-only pilot, and why now

Every prior beta/readiness phase in this engagement's history (Sprint 33 onward) tested via a browser-automation tool against a dev server — never a real, physical phone, over real days, under real conditions (a real commute, a real pocket, a real charger habit, real cellular signal, a real notch/Dynamic Island, a real OS "larger text" setting, a real week of forgetting the app exists and coming back to it). [APP_STORE_QUALITY.md](../product/APP_STORE_QUALITY.md)/[DEVICE_READINESS.md](../operations/DEVICE_READINESS.md)/[PHONE_SIGNOFF.md](../archive/audits/PHONE_SIGNOFF.md) (the immediately preceding phase) explicitly named several things as **not independently verifiable in that environment**: real notch occlusion, real iOS "Add to Home Screen" splash rendering, real battery/thermal behavior of the 3D scene, outdoor sunlight legibility, and real virtual-keyboard-avoidance behavior. A founder-only pilot is the cheapest, lowest-risk way to close exactly that gap — one real person, one real device, real daily use, before any external beta user is ever asked to trust the app with their own money-adjacent decisions.

This is deliberately **not** a redesign exercise and **not** a re-run of the many existing product/trust/UX audits already in this repo (`TRUST_AUDIT_LOG.md`, `MOBILE_TRUST_AUDIT.md`, `BUG_SEVERITY_STANDARD.md`, `IMPACTONE_RELEASE_GATES.md`, etc.) — it reuses that existing vocabulary and those existing standards rather than inventing a second, parallel one. Where this plan needs a severity scale or a trust-defect checklist, it points at the document that already defines one instead of redefining it.

## 2. Scope

- **Who:** the founder, alone. Not a cohort, not a beta-tester panel — this is explicitly pre-cohort validation.
- **Device:** one real physical phone, installed as a home-screen PWA (per [INSTALL_EXPERIENCE.md](../operations/INSTALL_EXPERIENCE.md)'s real, already-correct manifest/service-worker/icon setup), not just a browser tab kept open.
- **Duration:** 7 consecutive calendar days, used as a real daily habit would be used — not 7 back-to-back hours in one sitting.
- **Environment:** whatever backend the founder is actually pointed at (dev, staging, or the shared beta backend) — record which one in the daily log, since data freshness/availability findings are only meaningful if the environment is known.
- **What is explicitly NOT in scope:** modifying production code, redesigning any screen, adding features, fixing anything discovered mid-week (findings are recorded, not silently patched — see §6). A genuinely Critical, deterministic, isolated bug *may* be flagged for a separate, explicitly-scoped fix phase afterward, but this pilot's own job is to observe and record, not to fix.

## 3. The 14 coverage areas, mapped to the real, shipped product

Grounded in the real navigation structure (`Sidebar.jsx`/`BottomNav.jsx`), not invented screen names:

| Coverage area (mission) | Real screen(s)/mechanism |
|---|---|
| Morning market briefing | Home ("Today") — "Your morning brief" card, Morning Brief section |
| Portfolio review | Portfolio (bottom-nav) and, if reachable, Portfolio Workspace |
| Watchlist review | Watchlist Folders ("Workspaces" in the sidebar) — the real, persisted replacement for the legacy flat Watchlist |
| News intelligence | Daily Feed ("Feed" in bottom nav) and News Intelligence (Advanced tools, if reachable) |
| Recommendations | Recommendations ("For you" in bottom nav) |
| Alerts | Alerts (Advanced tools / Profile "More" links) |
| AI Analysis | AI Analysis / AI Analysis Workspace (Advanced tools) |
| Flagship and 3D experience | Flagship and 3D Workspace (sidebar Primary items — the immersive Earth-centered scenes) |
| Mobile portrait use | Every screen above, held normally, one-handed, thumb-reachable |
| Mobile landscape use | Every screen above, rotated — a historically fragile area for this product (see `SEVEN_DAY_USAGE_SCRIPT.md`'s explicit rotation checks) |
| Trust in data and explanations | Cross-cutting — applies to every screen above, evaluated via the reused [MOBILE_TRUST_AUDIT.md](../archive/audits/MOBILE_TRUST_AUDIT.md) 10-point framework |
| Speed and friction | Cross-cutting — real load times, real tap responsiveness, real scroll smoothness, on a real network (not localhost) |
| Battery and heat observations | Cross-cutting, especially after any extended Flagship/3D session |
| Installation and update behavior | Day 1 (install) and Day 7 (whatever real update banner behavior occurs during the week) |

## 4. Roles and tools

- **Observer/participant:** the founder — records observations in real time or within the same day, never reconstructed from memory days later.
- **Recording tools:** the phone's native screenshot and screen-recording capability (no extra app required). See [REAL_DEVICE_FEEDBACK_TEMPLATE.md](../product/REAL_DEVICE_FEEDBACK_TEMPLATE.md) §"Screenshot and screen-recording protocol" for exactly when each is required.
- **Log:** a single running file (or note) using [REAL_DEVICE_FEEDBACK_TEMPLATE.md](../product/REAL_DEVICE_FEEDBACK_TEMPLATE.md)'s format, one entry per finding, append-only — never overwritten, matching this engagement's existing `TRUST_AUDIT_LOG.md` convention.
- **Severity:** reuse [BUG_SEVERITY_STANDARD.md](../product/BUG_SEVERITY_STANDARD.md) verbatim (Critical/High/Medium/Low) — do not invent a second scale.
- **Trust-defect detection:** reuse [MOBILE_TRUST_AUDIT.md](../archive/audits/MOBILE_TRUST_AUDIT.md)'s 10 named checks verbatim, applied fresh each day rather than assumed from a prior session's result.

## 5. Daily cadence (summary — full script in SEVEN_DAY_USAGE_SCRIPT.md)

Each day has three real touchpoints, matching how a real user actually opens a finance app — not one long synthetic session:

1. **Morning session** (on waking / first real check of the day) — briefing, portfolio, watchlist, overnight alerts.
2. **Midday/anytime session** (whenever the founder would naturally check in) — news, recommendations, AI Analysis on one held or watched symbol.
3. **Evening session** (end of day) — Flagship/3D exploration, a deliberate landscape-rotation check, a deliberate friction/speed/battery note, and the day's log entry.

Day 1 additionally covers first install; Day 7 additionally covers the week's synthesis and any observed update-banner behavior (see §7 and `SEVEN_DAY_USAGE_SCRIPT.md`).

## 6. What gets recorded vs. what gets fixed

- **Recorded, not fixed, during the week:** every finding, regardless of severity, goes into the log per [REAL_DEVICE_FEEDBACK_TEMPLATE.md](../product/REAL_DEVICE_FEEDBACK_TEMPLATE.md). The pilot's value depends on an unbroken week of real conditions — patching mid-week would mean Day 5's "portfolio review" is no longer testing the same build Day 1's was, and would silently invalidate the week-over-week comparison this plan depends on (e.g. "does the same templated-explanation defect still appear on Day 6 as it did on Day 1").
- **Exception:** a Critical finding that makes the app *completely* unusable (per [BUG_SEVERITY_STANDARD.md](../product/BUG_SEVERITY_STANDARD.md)'s Critical bar) may justifiably need an out-of-band fix to continue the pilot at all — if that happens, log it explicitly as "pilot interrupted, build changed on day N" rather than silently continuing as if nothing changed.
- **No code is modified as part of this plan or its deliverables.** Any fix implied by a finding is a *future, separately-scoped* phase, decided at the Day 7 gate (`FOUNDER_GO_NO_GO.md`), not performed inline.

## 7. Installation and update behavior — what's actually being watched

Grounded in the real, shipped mechanism (not invented): `frontend/src/registerServiceWorker.js` registers `sw.js` and dispatches a real `impactone:update-available` window event the instant a new build's service worker finishes installing; `UpdateBanner.jsx` listens for that event and shows a real reload prompt. The pilot should:
- Confirm Day 1 install (via the browser's native "Add to Home Screen"/install prompt) produces a real home-screen icon, a correct launch (standalone, no browser chrome), and the branded boot/loading state — not a blank white flash (already verified in `APP_STORE_QUALITY.md`; this is a real-hardware re-confirmation, not a new check).
- If a new build is deployed to the environment during the week, confirm the update banner actually appears, and that tapping it reloads to the new build without losing the founder's local state unexpectedly.
- If no new build is deployed during the week, record that plainly as "not exercised this week" in `FOUNDER_GO_NO_GO.md` rather than fabricating a result.

## 8. End of week

See [FOUNDER_GO_NO_GO.md](../product/FOUNDER_GO_NO_GO.md) for the full decision gate. In summary: the week's log is reviewed against launch-blocking criteria (reusing [BUG_SEVERITY_STANDARD.md](../product/BUG_SEVERITY_STANDARD.md)'s "any Critical finding blocks" rule and [MOBILE_TRUST_AUDIT.md](../archive/audits/MOBILE_TRUST_AUDIT.md)'s fail conditions), and one of three outcomes is recorded: **GO**, **GO WITH NAMED FIXES REQUIRED FIRST**, or **NO-GO**. The gate document itself is a template to be filled in honestly at the actual end of the actual week — it is not pre-filled with an assumed outcome here, since the pilot has not yet occurred.
