# 13 — Screen Specifications

## Registered production views

Home; Flagship; 3D Workspace; Mission Control; Intelligence, Portfolio, News, Watchlist, AI Analysis, Market Intelligence, and Personal Intelligence Workspaces; Daily Feed; AI Analysis; Watchlist; Global Intelligence; Themes; Alerts; Portfolio; Watchlist Folders; Market Positioning; Decision Center; Decision Timeline; Market Dashboard; Recommendations; My Profile; Settings.

## Internal views

Intelligence Console, Health Dashboard, Admin Dashboard, and AI Performance Dashboard are registered only when `VITE_DEV_CONSOLE=true`. NOVA Showcase additionally requires the literal `/nova-showcase` URL.

## Common screen requirements

- Page purpose and primary action must be obvious without reading internal terminology.
- Live data must show freshness, provider gaps, and unavailable states.
- Navigation keys must match `screenRegistry`, sidebar, and bottom navigation; startup validation reports mismatches.
- Every async surface needs loading, empty, partial, error, and retry states.
- Financial conclusions should link to evidence/explanation rather than show unsupported scores.
- Internal diagnostics must remain unreachable in real production builds.

## Routing limitation

Most views are selected through application state, not URL routing. Refreshable deep links, browser back/forward behavior, and shareable screen URLs are therefore limited except for the special NOVA route.
