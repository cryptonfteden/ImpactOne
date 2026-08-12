# 10 — UI/UX Design System

## NOVA layers

The client imports `tokens.css`, `theme.css`, `typography.css`, `motion.css`, `layout.css`, `accessibility.css`, and `components.css` after the legacy `styles.css`. This establishes tokens and reusable NOVA styles while retaining historical global styling.

## Principles evidenced in components

- Dark financial-intelligence visual language with explicit hierarchy.
- Shared loading, skeleton, empty, error, offline, update, and demo states.
- Reduced-motion and accessibility layers.
- Safe-value rendering for unavailable data.
- Confidence, attention, quality, and status visualization components.
- Responsive sidebar/bottom navigation and focused workspaces.

## Three-dimensional experiences

Flagship and 3D Workspace use Three.js/React Three Fiber and are lazy-loaded. They must preserve usable non-3D navigation, reduced-motion support, keyboard access, and acceptable mobile performance.

## Gaps

- Legacy global CSS and NOVA coexist, so token adoption is incomplete.
- Repository documents many visual rules and audits but lacks an automatically generated component catalog.
- Accessibility compliance level is not certified by the presence of accessibility CSS or component tests alone.
