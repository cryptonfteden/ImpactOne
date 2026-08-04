# Beta Trust Report — Phase E2

Implements only the Critical and High findings from Phase E1 (`BETA_UX_AUDIT.md`). No recommendation logic, AI Analysis, committee, learning, or backend API was touched — every change is frontend presentation/configuration.

## Changes Made, Mapped to E1 Findings

### Critical #2 — Default Portfolio screen had unverified loading/error handling
**Fix:** `frontend/.env` now sets `VITE_PORTFOLIO_ENGINE=api`, making the better-instrumented `PortfolioEngineScreen.jsx` (real `ErrorState`, disabled/"Placing..." button state, confirm-before-reset) the default for the beta build, instead of the legacy screen.
**Scoping detail:** added `frontend/.env.test` to override this back to unset for the unit test suite, preserving the existing regression test that asserts the code's own unset-flag default (legacy) — this is a real, intentional contract in `PortfolioScreen.test.jsx` and was not weakened.

### High #4 — Recommendations empty state was honest but not actionable
**Fix:** `frontend/src/components/ui/EmptyState.jsx` gained optional `title`/`icon`/`actionLabel`/`onAction`/`actionDisabled` props — fully backward compatible (all 4 other existing call sites, unmodified, still render exactly as before, message-only). `RecommendationsScreen.jsx`'s empty state now shows a title, a concrete cadence explanation using the real `status.intervalMinutes` value already available in the hook, and a "Run engine now" action wired to the screen's existing `runNow()` call — no new API, no new data source.

### High #3 — No onboarding guidance for a zero-data first session
**Fix:** New `frontend/src/components/WelcomeOverlay.jsx` — a lightweight, dismissible, one-time overlay (localStorage-gated, never reappears once dismissed) shown on top of the already-rendered app shell in `MainLayout.jsx`. Sets expectations honestly: recommendations appear only when the engine finds a real opportunity, Portfolio is simulated, everything is advisory-only. Does not block, delay, or gate any real screen content.

### High #5 — Settings showed non-functional controls with no indication they were static
**Fix:** `SettingsScreen.jsx`'s "Appearance" and "Notifications" sections now carry an explicit subtitle ("— not yet configurable") and a one-line disclosure ("These are the current defaults for this beta. Per-user customization isn't available yet.") instead of silently presenting static bullet text as if it were live settings.

### Low #11 (bundled as a fast win alongside the above loading-state work) — Blank, unbranded initial-load state
**Fix:** `AppRoot.jsx`'s pre-profile-check loading state (previously an unstyled blank `aria-busy` div — literally the first pixel every user sees) now shows the existing `LoadingSpinner` component plus the product name, using only already-existing components.

## Explicitly Not Implemented This Phase

- **Critical #1 (no charts anywhere)** — correctly out of scope: High effort, requires a new dependency, not a Critical/High-effort-appropriate fix within this phase's "no feature expansion" constraint. Left for a dedicated future phase.
- **High #6 (no visible self-service reset)** — partially addressed by #2 (the beta-default `PortfolioEngineScreen` already has a visible, confirm-gated Reset button); a full account/session concept remains out of scope, as E1 itself noted was likely acceptable for a 5-person beta.
- Medium/Low items (mobile polish, accessibility baseline, toast system, dead-file cleanup) — explicitly deferred by E1's own recommendation; not attempted here.

## Test Verification

Full frontend suite run after all changes: **164/164 tests passing across 26/26 files.** One real conflict was found and fixed correctly rather than papered over: enabling the beta Portfolio flag in `.env` initially broke `PortfolioScreen.test.jsx`'s "renders the legacy screen by default" regression test (because Vite loads `.env` for test runs too) — resolved with a `.env.test` override, not by weakening or deleting the test. A second, unrelated collision (the new empty-state action button's default label duplicated the screen header's existing "Run now" button, breaking two `getByRole` lookups) was fixed by renaming the empty-state action to "Run engine now" — a deliberate, more specific label, not just a test workaround.

## Compliance

No recommendation logic, committee logic, learning code, scoring, AI Analysis logic, or backend API was modified. All changes are frontend presentation (`EmptyState`, `WelcomeOverlay`, `AppRoot`, `SettingsScreen`, `styles.css`) or configuration (`frontend/.env`, `frontend/.env.test`). No commits were made. Nothing was pushed.
