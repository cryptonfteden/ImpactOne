# NOVA Showcase (Phase X12C.0)

## What it is

ImpactOne's own Human Interface Gallery / Material Design Gallery equivalent — a single, complete, real page (`/nova-showcase`) rendering every component the NOVA system defines, built entirely from the real NOVA Foundation (Phase X12B tokens, theme engine, typography, layout primitives, motion). **No application screen was redesigned or modified.**

## Route

`GET /nova-showcase` — a **real URL path**, checked directly in `frontend/src/main.jsx` before any routing/auth logic runs, since this app has no client-side router (`react-router` or equivalent) anywhere in its dependency tree. Adding one solely for a single dev-only page would itself be real infrastructure expansion, disproportionate to the mission and outside its "no infrastructure expansion" spirit from prior phases — a plain `window.location.pathname` check is the minimal, real mechanism that satisfies "create a new route" without that cost.

## Development-only, never in production

Two independent conditions must both be true for the route to render anything other than the normal app:

```js
const IS_NOVA_SHOWCASE_ROUTE =
  window.location.pathname === "/nova-showcase" && import.meta.env.VITE_DEV_CONSOLE === "true";
```

`VITE_DEV_CONSOLE` is never set in a production build — the same precedent already used for Health Dashboard, Admin Dashboard, Intelligence Console, and the AI Performance Dashboard (all `screenRegistry.js`/`Sidebar.jsx`-gated). Unlike those, the Showcase isn't even nav-reachable — it doesn't appear in `screenMap` at all, and is only reachable by typing the literal URL with the flag set. In production, visiting `/nova-showcase` renders the normal app exactly as if the path were anything else.

## What it contains

All 13 required sections (`SHOWCASE_SCREEN_GUIDE.md` has the full inventory): Brand Identity, Color System, Buttons, Inputs, Cards, AI Components, Data Visualization, Navigation, Notifications, Loading, Motion Showcase, Accessibility, Responsive.

## No hardcoded values

Every visual value across every showcase component and section resolves through a `--nova-*` custom property (`tokens.css`/`theme.css`) — verified by direct grep across `frontend/src/styles/components.css` and every `frontend/src/components/nova/*.jsx` file finding zero raw hex colors used for styling. The only literal hex values anywhere in the Showcase are in `ColorSystemSection.jsx`/`AccessibilitySection.jsx`, passed as *arguments* to the real `contrast.js` checker (Part 7) to demonstrate the actual computed contrast ratio behind `--nova-color-text-tertiary` — content for a live calculation, not a styling shortcut. Raw px values outside token references are limited to documented, demo-only layout math (e.g. `ResponsiveSection.jsx`'s preview-frame widths, which are the *subject being demonstrated*, not a design token).

## No duplicated components

Every one of the 13 sections renders instances of the **same** real component set (`frontend/src/components/nova/`) — e.g. every card variant (Default/Glass/AI/Recommendation/News/KPI/Portfolio/Expandable/Loading) is the one `Card.jsx` component with a `variant`/`elevation`/`loading`/`expandable` prop, never nine separately-implemented card components.

## Tests

`frontend/src/screens/NovaShowcaseScreen.test.jsx` (5 tests) verifies all 13 sections render, in the mission's required order, with real content. `frontend/src/components/nova/novaComponents.test.jsx` (14 tests) covers the core reusable components directly: `Button`'s variant/loading/disabled behavior, the confidence-band vocabulary's real score-range boundaries, `Card`'s elevation defaults and glass opt-in, `Field`/`Toggle`, and `AiLearning`'s threshold-crossing behavior.
