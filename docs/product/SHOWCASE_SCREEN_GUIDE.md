# Showcase Screen Guide (Phase X12C.0)

How to reach the NOVA Showcase, and exactly what each of its 13 sections demonstrates.

## Reaching it

1. Run the frontend with `VITE_DEV_CONSOLE=true` (same env flag as every other dev-only screen — Health Dashboard, Admin Dashboard, Intelligence Console, AI Performance Dashboard).
2. Navigate the browser to `/nova-showcase` directly — there is no nav link, no sidebar entry, no in-app way to reach it. This is deliberate: the Showcase is a reference tool for engineers/designers, not a product surface.
3. Without the flag set (any real production build), the same URL renders the normal app — the route is structurally inert, not merely hidden.

## Section-by-section guide

| # | Section | What it demonstrates |
|---|---|---|
| 1 | **Brand Identity** | Wordmark, the three brand colors (Signal/Violet/Cyan), the three type families in use, and the 8px spacing scale as visual bars |
| 2 | **Color System** | All 4 semantic colors, all 4 surface levels, 3 real glow examples, all 4 Panel elevation levels (including opt-in Glass), and a real computed WCAG contrast statement (not asserted — computed live via `contrast.js`) |
| 3 | **Buttons** | All 5 variants (Primary/Secondary/Ghost/Danger/Success), Loading, Disabled, an icon-only button, all 3 sizes, and a real, tab-reachable keyboard-focus demonstration |
| 4 | **Inputs** | Text, Search, Select/Dropdown, a real Checkbox/Radio/Toggle/Slider, a real date-picker *placeholder* (mission-specified — not a functioning picker), and all 3 validation states (default/error/success) |
| 5 | **Cards** | All 9 named variants — proven to be the *same* `Card` component via a shared prop contract, not 9 separate implementations |
| 6 | **AI Components** | Thinking, Learning, Updated, Memory, Confidence, Recommendation, plus the shared Confidence badge and Evidence badge — the product's single most differentiating visual language |
| 7 | **Data Visualization** | A real table, a real symbol/sector heatmap (diverging Rose→Emerald scale), a chart *placeholder* (mission-specified), a tooltip, a legend, and a progress bar |
| 8 | **Navigation** | A sample sidebar and topbar (presentational only — not the app's real `Sidebar.jsx`), a breadcrumb, tabs with real state, a real toggleable drawer, a context menu, and a floating panel |
| 9 | **Notifications** | Toast, Alert, Banner, and Inline message, each across all 4 semantic tones |
| 10 | **Loading** | Skeletons, a progress bar, the AI Thinking wave, an empty state, an offline banner, and a reconnect banner |
| 11 | **Motion Showcase** | Every approved transition duration (Micro/Standard/Screen) as a live animated swatch, the AI Thinking loop, a skeleton shimmer, and a **live** Reduced Motion toggle wired to the real `ThemeProvider` — flipping it visibly disables every animation on the page |
| 12 | **Accessibility** | Real tab-reachable focus rings, a live computed contrast ratio, a genuine `dir="rtl"` vs `dir="ltr"` side-by-side layout comparison, and a live font-scaling slider |
| 13 | **Responsive** | The real `Grid` primitive rendered at Mobile/Tablet/Desktop/Ultra-wide preview widths, side by side |

## What this guide is not

Not a design spec (that's `NOVA_DESIGN_BIBLE.md`), not a token reference (that's `DESIGN_TOKENS.md`), not a component API reference (that's `SHOWCASE_COMPONENT_MAP.md`). This document only answers "how do I get to the Showcase, and what will I find in each section."
