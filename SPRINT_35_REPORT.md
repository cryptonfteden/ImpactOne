# Sprint 35 — Daily Value & Internationalization Foundation — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Commits:** 6 · **Date:** 2026-07-18

## Mission

ImpactOne is READY FOR 5 USERS (Sprint 34). From this sprint onward, every change must improve the real daily experience of those users — no speculative features, no architecture for architecture's sake.

## Priority 1 — Internationalization Foundation

Infrastructure only, per the mission — English remains the sole translated locale this sprint.

- **`frontend/src/i18n/I18nProvider.jsx`** — a lightweight, dependency-free React context (no i18n library added, consistent with this repo's established preference for the native platform over new dependencies when it already covers the need). Exposes `t(key, params)` with `{placeholder}` interpolation and an English fallback, `locale`/`setLocale` persisted to `localStorage`, and `dir`/`lang` auto-applied to `<html>`. `LOCALE_REGISTRY` is structured so adding a new language later is "drop a `locales/<code>.json` file + one line," not a code change anywhere else — genuinely supports unlimited languages.
- **`frontend/src/i18n/formatters.js`** — date/time/number/currency/percent/relative-time formatting built entirely on the native `Intl` API, locale-aware by construction (no hardcoded `en-US` shape).
- **`frontend/src/i18n/rtlLocales.js`** — RTL detected by language code (`ar`, `he`, `fa`, `ur`, `yi`, `ps`, `sd`); direction is derived automatically everywhere, never hardcoded per-component.
- **Migrated as concrete proof, not just built and left untested**: `BottomNav`, `Header` (including locale-aware currency formatting for the portfolio glance, replacing hardcoded `$`/`.toLocaleString()`), `HomeScreen` (every label, empty state, and interpolated sentence, plus locale-aware relative-time freshness), and a new functional language switcher in Settings.
- **Live-verified**: `<html dir="ltr" lang="en">` correctly set on load; nav labels render through `t()`; language select renders with the one registered locale.

**Honest scope limit**: ~25 remaining screens/components still use hardcoded English strings. Full coverage across the whole app is multi-sprint work; this sprint builds and proves the infrastructure on the highest-traffic surfaces (nav, header, Home) rather than claiming a complete sweep that didn't happen.

## Priority 2 — Daily Value Improvements

Reviewed every primary screen for duplicated information and unnecessary scrolling. Found and fixed one concrete, real instance: Portfolio's **"Today's Agent Trades"** section was the very last thing on the page (after 7 other sections), showing the same open positions' symbol/action that **"Open Positions"** already displays immediately below the hero — the same fact, twice, forcing a full scroll to see it again. Removed it.

Other primary screens (Daily Feed, Recommendations, Profile) were reviewed and found not to have the same pattern — Recommendations' list/calibration/lessons cards each show genuinely distinct information, and Sprint 32/33's Adaptive Home ordering and progressive-disclosure work already addressed most of Home's scroll/duplication concerns in prior sprints.

## Priority 3 — Recommendation Clarity

The mission's four questions (what happened / why now / what could invalidate it / what should I watch next) had to be answerable with **zero taps**, not behind the card's existing expand toggle. Added an always-visible "at a glance" block:

- **What happened** — the existing always-visible thesis + action pill (no change needed).
- **Why now** — new line, reusing the existing timestamp/horizon logic.
- **What could invalidate it** — first `invalidationCondition` (the full list stays in the existing expanded section — this is a preview, not a duplicate).
- **What should I watch next** — first `keyRisk`.

All four reuse data the list endpoint already returns on the recommendation object — no new fetch, nothing fabricated. A question with no real answer in the data is simply omitted, never padded with a placeholder. Verified live and by a new test.

## Priority 4 — Morning Brief Polish

Found and fixed real duplicated information while auditing Home for Priority 2: the hero's `personalBrief` already leads with `"Market: {headline}"` whenever it has content, and the Morning Brief card directly below repeated the identical headline as its own first line a few inches down the same screen — the same fact stated twice on one screenful, adding to cognitive load without adding a new fact. Now the card only shows the raw headline when the hero brief didn't already state it (e.g. an empty `personalBrief`), verified by two new tests covering both cases.

The backend's meaningful-change filtering (`MEANINGFUL_CHANGE_THRESHOLD_PCT` in `portfolioEngineService.getPerformanceDelta`) and the personal-brief de-duplication (Sprint 31 Priority 3, "no sentence justifies its existence twice") were already solid from prior sprints and needed no further changes.

## Priority 5 — Private Beta Telemetry

New `AnalyticsEvent` model — genuinely anonymous by construction: **no userId, profileId, IP, or device-identifier column exists on the table at all**, so nothing stored here can ever be tied back to a specific person even by mistake.

- `analyticsService.recordEvent()` enforces a fixed 7-event allowlist (`first_open`, `onboarding_completed`, `recommendation_viewed`, `recommendation_expanded`, `feedback_submitted`, `morning_brief_read`, `returning_user`) — an unrecognized event name is rejected, not silently accepted, so this can't quietly grow into a general-purpose tracking pipe.
- Property keys are also allowlisted (`symbol`/`action`/`feedbackType`/`cardKey` only) and values constrained to primitives — nothing from the investor profile (age, country, income, risk tolerance) could be smuggled in even by an incorrect caller.
- `POST /v2/analytics/event` — new, additive route; no existing public API contract changed. Always returns 204, since the frontend caller is fire-and-forget by design and never inspects the response.
- All 7 events wired to real, honest trigger points:
  - `first_open` — once per device, ever (localStorage-gated).
  - `returning_user` — only when the session *started* already onboarded, not right after onboarding completes.
  - `onboarding_completed` — after a real profile is created.
  - `recommendation_viewed` — same trigger as the existing Sprint 30 reading-behavior signal.
  - `recommendation_expanded` — opening full Decision Review specifically (deeper engagement than viewed).
  - `feedback_submitted` — on successful submission, with the real feedback type.
  - `morning_brief_read` — on every successful Home summary load.
- 5 new backend tests with real DB assertions (allowlist rejection, property sanitization, non-primitive stripping, anonymity of the stored row).

## Verification

- **Backend:** 365/365 tests passing (5 new). Two earlier runs showed spurious failures traced to two full suites accidentally running concurrently against the same test database — a tooling artifact, not a regression; a clean, isolated run confirmed 365/365.
- **Frontend:** 143/143 tests passing (10 new/updated across HomeScreen, RecommendationCard, and the i18n-wrapping test-utility fix).
- **Production build:** clean, 99.38 KB gzip JS (grew ~2.5 KB gzip for the entire i18n framework + telemetry + clarity features combined).
- **Browser verification:** live-checked Home (freshness label, no duplicate headline), Recommendations (all four "at a glance" answers visible with zero taps), Portfolio (duplicate section confirmed removed), and the language switcher — zero console errors throughout.
- **No public/external API contract changed** — the only new route (`POST /v2/analytics/event`) is additive, matching every prior sprint's precedent for new internal endpoints.

## What's Next (honest, not hidden)

- **i18n**: the framework is real and proven, but only ~4 of ~30 screens are migrated. The natural next step is translating `en.json` into a second real language and migrating the remaining screens incrementally — the infrastructure imposes no redesign to do this, by design.
- **Telemetry**: events are captured but there's no dashboard/aggregation view yet (the mission asked to "prepare" analytics, not build a reporting UI) — `analyticsEventRepository.countByEventName()` exists as a starting point for one.
- **Daily Value**: this sprint's review found one clear duplication (Portfolio). A deeper per-screen readability pass (Feed, Recommendations, AI Analysis) would likely find more, given the codebase's history of small readability regressions creeping back in between sprints (per Sprint 33/34's own bug-finding pattern) — worth a dedicated look next time daily-value work resumes.

## Recommendation

This sprint made no speculative bets: every change ties directly to daily usability (i18n infra unblocks future markets without redesigning anything later, telemetry answers "is this actually being used," recommendation clarity and Morning Brief dedup directly reduce the cognitive load Nir experiences every single day). ImpactOne remains **READY FOR 5 USERS** — nothing in this sprint changed the private-beta-readiness picture from Sprint 34, since no product-readiness blocker was reopened and no new one was introduced.
