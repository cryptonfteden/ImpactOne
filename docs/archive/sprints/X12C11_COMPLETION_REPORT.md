# Phase X12C.1.1 — Mission Control Home — Sonnet Review Corrections — Completion Report

## Mission

Apply only the 5 corrections identified by the live Sonnet review of Mission Control Home (Phase X12C.1). No redesign, no new features, no layout change.

## Scope discipline

Every change below is either a one-line class/component swap or an `undefined`/`null` guard. `MissionControlHomeScreen.jsx`'s section structure, grid spans, data sources (`homeApi.getSummary` / `priceAlertsApi.list`), and component composition are unchanged from X12C.1.

---

## 1. Duplicated KPI titles

**Issue:** Each KPI tile rendered its title twice — once via `Card`'s `eyebrow` prop, and again as the visible text inside the `Badge` next to the value (`<Badge tone={kpi.tone}>{kpi.label}</Badge>`).

**Root cause:** The KPI tile was built by copy-adapting the Home screen's glance-pill pattern (`label: value`), which assumes a single inline pill with no separate title slot. `Card`'s `eyebrow` prop already gives KPI tiles a title slot, so keeping the label in the Badge too was a leftover duplicate, not an intentional second usage.

**Fix:** `Card eyebrow={kpi.label}` remains the single source of the title. The `Badge` now wraps only the value (`<Badge tone={kpi.tone}><strong className="nova-text-lg">{kpi.value}</strong></Badge>`) — it conveys tone/urgency through color, never repeats the label text.

**Verification:** New test `"each KPI title appears exactly once"` asserts `getAllByText(label)` returns exactly 1 match for all four KPI labels (Action needed, Portfolio changes, Beliefs updated, Active alerts).

---

## 2. Misleading Portfolio Risk fallback (`0/100`)

**Issue:** When `portfolioMorningSummary.biggestOpportunity` was absent, the screen still rendered `<AiConfidence score={... ?? 0} />` — displaying a literal `0/100` confidence bar and badge, which reads as "the AI scored this at zero confidence," not "there is no opportunity to score."

**Root cause:** The `?? 0` fallback was written to avoid a `NaN`/`undefined` prop crash, but it collapsed "absence of data" and "a real score of zero" into the same visual — a fabricated value standing in for missing data.

**Fix:** `AiConfidence` now only renders when `portfolioMorningSummary?.biggestOpportunity` genuinely exists. Otherwise the section shows the same honest `EmptyState` pattern used everywhere else on this screen (new string: `missionControl.empty.portfolioRisk` — "No standout opportunity to score right now.").

**Verification:** New test asserts the Portfolio Risk region's text content never contains `"0/100"` when `biggestOpportunity` is `null`, and that the EmptyState message is shown instead.

---

## 3. Legacy `.ghost-button` usage

**Issue:** Three raw `<button className="ghost-button">` elements (Recommendations, Portfolio, Decision Center CTAs) — a legacy app-wide button class, not a NOVA component.

**Root cause:** Copied directly from `HomeScreen.jsx`'s existing pattern during the original build, since Mission Control's action buttons mirror Home's "review/open X" CTAs.

**Fix:** All three replaced with the certified NOVA `Button` component (`variant="ghost"`), which maps to the identical visual treatment already defined in `components.css`'s `.nova-button[data-variant="ghost"]` — no visual change, only the underlying markup/class.

**Verification:** New test enumerates every `<button>` in the rendered tree and asserts none carries the `ghost-button` class and all carry `nova-button`.

---

## 4. Legacy typography helpers

**Issue:** The screen used the legacy, hardcoded-color classes `.eyebrow`, `.company-description` / `.company-description.subtle` / `.negative`, and a plain unstyled `<h1>` — all defined in `frontend/src/styles.css` with raw hex colors (`#4ade80`, `#f87171`, etc.), not NOVA design tokens.

**Root cause:** Same copy-adapt-from-Home origin as #3 — Home predates the NOVA typography system (Phase X12B) and still uses the original app-wide type classes.

**Fix:** Replaced one-for-one with NOVA typography (`typography.css`, token-driven):
- `.eyebrow` → `nova-heading-eyebrow`
- bare `<h1>` → `<h1 className="nova-heading-h1">`
- `.company-description.subtle` (body/secondary text) → `nova-heading-subtext`
- `.company-description.negative` (error text) → the certified NOVA `Alert` component (`tone="error"`), which uses `--nova-color-negative` internally rather than a hardcoded hex, and is a real semantic upgrade over a bare colored `<p>`.

**Verification:** New test asserts zero elements matching `.company-description, .eyebrow, .ghost-button, .pill` remain in the rendered DOM.

---

## 5. RTL — physical `padding-left`/`padding-right`

**Issue:** None of Mission Control's own JSX/inline styles used physical left/right properties (confirmed by grep — zero matches). The actual defect was inherited: the shared `.stack-list` class (used by three of Mission Control's sections — Priority Intelligence, Top Recommendation, Belief Changes) is defined in `frontend/src/styles.css` with `padding-left: 18px`, a physical property that does not mirror under `dir="rtl"`.

**Root cause:** `.stack-list` predates the NOVA Foundation's logical-property convention (Phase X12B's Layout Foundation uses `margin-inline`/`padding-inline` throughout; this older shared class was never migrated).

**Fix:** Changed `padding-left: 18px` → `padding-inline-start: 18px` in `frontend/src/styles.css`. This is a pure bug fix: identical rendering in LTR (where `padding-inline-start` resolves to `padding-left`), and correctly flips to the trailing edge under `dir="rtl"`. Since `.stack-list` is shared, this fix also silently corrects the same latent RTL bug everywhere else it's used (e.g. Home screen) — a strict improvement, not a scope expansion, and confirmed via the full test suite (359/359 still passing).

**Verification:**
- Grep confirms `Mission Control` itself never sets a physical left/right property. New test asserts `Page`'s root element carries the `dir` value forwarded live from `useI18n()` rather than a hardcoded `"ltr"`, proving the wiring flips automatically once an RTL locale is registered.
- A true on-screen forced-RTL render was **not** performed: the app has only one registered locale (`en`, LTR) in `I18nProvider`'s `LOCALE_REGISTRY` — this is pre-existing infrastructure scope from Phase X12C.1, not something this correction pass should expand. RTL correctness here rests on (a) the `dir`-forwarding test, (b) the `padding-inline-start` fix, and (c) NOVA's layout primitives already using logical properties exclusively (verified by reading `Container.jsx`/`Stack.jsx`/`Grid.jsx` — no `left`/`right` anywhere in `components.css` either).

---

## Verification

### Automated
```
npx vitest run src/screens/MissionControlHomeScreen.test.jsx
 Test Files  1 passed (1)
      Tests  11 passed (11)      (6 original + 5 new regression tests for this pass)

npx vitest run   (full suite)
 Test Files  54 passed (54)
      Tests  359 passed (359)    (354 + 5 new; 0 regressions, incl. from the shared .stack-list CSS fix)
```

### Responsive (desktop / tablet / mobile)
No layout structure was touched — Mission Control still uses NOVA's existing `.nova-grid` (12/8/4-column breakpoints at 1280px/768px, defined once in `layout.css`, unchanged this pass) with the same `gridColumn: "span 3"` / `"span 6"` spans from X12C.1. Verified by reasoning against the unchanged CSS plus the passing layout-primitive test suite (`layoutPrimitives.test.jsx`); not re-verified in a live browser viewport this pass (no dev server session was started).

### RTL / LTR
Covered above under item 5 — `dir`-forwarding test passes; a live forced-RTL render was not performed because only an LTR locale exists in the app today (pre-existing scope, not part of this correction set).

## Files changed

- `frontend/src/screens/MissionControlHomeScreen.jsx` — all 5 corrections applied.
- `frontend/src/screens/MissionControlHomeScreen.test.jsx` — 5 new regression tests (one per correction, dir-forwarding test included under #5).
- `frontend/src/i18n/locales/en.json` — added `missionControl.empty.portfolioRisk` string for the new honest empty state.
- `frontend/src/styles.css` — `.stack-list`'s `padding-left` → `padding-inline-start` (root-cause fix for #5).
- `X12C11_COMPLETION_REPORT.md` (this file).

No commits. No push.
