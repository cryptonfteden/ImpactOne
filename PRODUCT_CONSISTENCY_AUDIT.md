# Product Consistency Audit — Phase X7, Part 5

Audited every screen's real CSS and component code against `DESIGN_LANGUAGE.md` (typography, spacing, cards, buttons, charts, colors, loading, errors, empty states, animations) — not by inspection alone, a targeted grep-based audit across `styles.css` and every screen/component file.

## Fixed this phase

**`ImpactGraph.jsx`'s expand/collapse toggle had a weak accessible name.** The button's glyph (▾/▸) was correctly `aria-hidden`, and its visible headline text technically supplied *some* accessible name — but nothing described the actual toggle action. Fixed: `aria-label="{Expand|Collapse} evidence for {headline}"`, matching `DESIGN_LANGUAGE.md`'s "every icon-only button has a real accessible label" rule in spirit even though this wasn't a fully silent button.

## Found, documented, not fixed this phase — and why

**Two competing color-token systems coexist in `styles.css`.** A legacy "Sprint 5" `:root` block (`--success: #37d68e`, `--danger: #ff6b79`) sits alongside a spec-matching `--h3-*` block (`--h3-positive: #34d399`, `--h3-negative: #f87171`, matching `DESIGN_LANGUAGE.md` exactly). Components using the older variables silently render off-palette. **Not fixed this phase**: `--success`/`--danger` are referenced across an unknown number of components built before the `--h3-*` system existed; a blind find-and-replace risks a visual regression this phase has no browser-based visual-regression test to catch. This is real, scoped, safe follow-up work — a grep-and-migrate pass, one component at a time, each verified by eye — not a same-phase blind edit.

**Two legacy selectors (`.search-box`, `.market-pill`) use raw hex colors untracked to any token.** Same reasoning as above: isolated, low-traffic selectors, real but small drift, safer as documented follow-up than a rushed fix under this phase's broader scope.

**`.hero-panel`/`.screen-hero` hardcode `border-radius: 24px`**, 2px over `DESIGN_LANGUAGE.md`'s documented 20-22px ceiling for primary cards, and don't reference the `--h3-radius-lg` (22px) token at all. A 2px difference is not user-visible on its own, but it means these two selectors won't track future radius-token changes. Documented for a future pass that adjusts the token, not the hardcoded value, so both drift together correctly from then on.

## Checked, and found already compliant — not just assumed

- **Icon-only button coverage**: every other icon-only button in the codebase (`NotificationCenter.jsx`'s bell, `OnboardingFlow.jsx`'s back button) already carries a real `aria-label`. The `ImpactGraph` fix above was a localized gap, not a systemic one.
- **Primary:ghost button ratio**: only two screens use `primary-action` at all (`InvestorProfileScreen.jsx`: 1 primary/0 ghost; `WatchlistFoldersScreen.jsx`: 2 primary/10 ghost, a 5:1 ratio) — both comply with the mission's ≥4:1 floor. No screen was found stacking competing filled buttons.
- **No hardcoded inline colors in JSX**: searched every `.jsx` file for `style={{ color: '#...' }}`-shaped patterns — none exist. Color is consistently applied via CSS classes/custom properties, not inline styles — the one drift vector that would have been hardest to catch systematically is clean.
- **Focus states**: the global `input:focus-visible`/`button:focus-visible` rule (`styles.css`) already supplies a real, visible accent-tinted box-shadow ring to every focusable input/button in the app, including `.search-box input` (which sets `outline: 0` locally but is still covered by the universal `:focus-visible` selector) — verified by re-reading the cascade, not assumed from the local rule in isolation.

## Screens/components already following the design system correctly (spot-checked, representative sample)

Every screen built or touched across Phases X3–X7 (Decision Center, Notifications, Workspaces, Health Dashboard, Decision Timeline, Executive Dashboard) consistently reuses the same real component vocabulary — `SectionCard`, `EmptyState`, `ErrorState`, `LoadingSpinner`, `pill`/`pill opportunity`/`pill risk`/`pill monitor`, `ghost-button`, `company-description subtle` — rather than each screen inventing its own card/button/text treatment. This is the real, structural reason the audit above found so few violations: the design system is enforced by shared component reuse, not by convention alone.
