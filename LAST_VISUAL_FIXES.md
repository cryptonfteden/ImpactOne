# LAST_VISUAL_FIXES.md — Phase PIXEL-PERFECT-001

Precise before/after record of every CSS change made this phase, all in `frontend/src/styles.css`.

---

## Fix 1 — Tablet-portrait navigation gap (721-900px)

**Before:** `@media (max-width: 900px) { .sidebar { display: none; } .notification-panel {...} .folder-grid {...} .alert-row {...} .header-portfolio-glance {...} }` — hid the sidebar with no compensating navigation.

**After:** the same block, with the bottom nav's real markup/styles (`.main-panel` padding-bottom, `.bottom-nav`, `.bottom-nav__item`, `.bottom-nav__item.active`, `.bottom-nav__icon`, `.bottom-nav__label` — copied verbatim from the existing 720px block, not redesigned) added inside it.

**Verified:** at 768/820/900px — `sidebarDisplay: "none"`, `bottomNavDisplay: "flex"`, zero horizontal overflow. At 901px — correctly reverts to `sidebarDisplay: "block"`, `bottomNavDisplay: "none"` (normal desktop).

## Fix 2 — `.main-panel` missing `min-width: 0`

**Before:**
```css
.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}
```

**After:**
```css
.main-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
```

**Verified:** removed `.main-panel`/`.header-bar` from the set of elements overflowing the viewport at 1024px width (confirmed via a real DOM sweep of every element's `getBoundingClientRect().right`).

## Fix 3 — Narrow-desktop / tablet-landscape header overflow (981-1149px)

**Before:** no rule covered this range — `.header-controls` stacked into a column only below 980px (`@media (max-width: 980px)`), and fit naturally in a row only from ~1150px up, leaving 981-1149px with neither treatment.

**After:** new block added directly after the existing 980px one:
```css
@media (min-width: 981px) and (max-width: 1149px) {
  .header-controls {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: 100%;
  }
}
```

**Verified:** zero horizontal overflow swept across 900/950/1000/1024/1080/1100/1149/1150/1200/1440px — every single width, not just the two range endpoints.

## Fix 4 — Missing hover-transition timing (5 selectors)

**`.header-suggestion`** — before: no `transition`; after: added `transition: color 0.2s ease, border-color 0.2s ease;`

**`.analysis-sticky-nav__link`** — before: no `transition`; after: added `transition: color 0.2s ease, border-color 0.2s ease;`

**`.header-menu__item`** — before: no `transition`; after: added `transition: background 0.2s ease;`

**`.onboarding-back-button`** — before: no `transition`; after: added `transition: color 0.2s ease;`

**`.primary-action`** — before: `transition: transform 0.2s ease` (shared with `.ghost-button`), but its own `:hover` rule *also* changes `box-shadow`, which wasn't covered; after: the `.primary-action` base rule (the one that sets its gradient/box-shadow/font-weight) now also declares `transition: transform 0.2s ease, box-shadow 0.2s ease;`, so both hover-changed properties animate consistently.

## Regression evidence

- `npx vitest run`: 621/621 passing (77 files), matching the pre-fix baseline exactly.
- `npm run build`: succeeded, output identical in structure to the pre-fix baseline (same pre-existing `INEFFECTIVE_DYNAMIC_IMPORT`/chunk-size warnings, no new ones).

## Commit

Committed locally only, scoped to exactly the one file touched (`frontend/src/styles.css`) plus this phase's 4 new documentation deliverables — not pushed, per the mission's explicit instruction.
