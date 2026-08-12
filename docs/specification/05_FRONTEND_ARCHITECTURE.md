# 05 — Frontend Architecture

## Composition

`main.jsx` loads the global design layers, registers the service worker, records session telemetry, and renders `AppRoot` inside application providers and a top-level error boundary. The application uses internal active-view navigation rather than React Router. A literal `/nova-showcase` path is supported only when `VITE_DEV_CONSOLE=true`.

## Navigation

`screenRegistry.js` is the canonical mapping from view names to feature components. Heavy 3D, global-intelligence, and flagship screens are lazy-loaded. Sidebar and bottom-navigation keys are validated at startup against the registry; Home is the fallback.

## State and data

- Shared concerns live in `frontend/src/context`, hooks, services, and API configuration.
- `VITE_API_BASE_URL` defines the backend boundary.
- `VITE_PORTFOLIO_ENGINE` selects legacy localStorage or API portfolio behavior.
- Beta identity, favorites, and some preferences use browser storage; server-backed domains use v2 APIs.
- Error boundaries, safe values, loading, empty, offline, and update states are reusable.

## Feature organization

There are 29 feature directories including home, analysis, recommendations, portfolio, news, alerts, themes, watchlists, decision center/timeline, mission control, specialized workspaces, flagship, and 3D workspace.

## Frontend risks

- View-state navigation limits deep links and browser history semantics.
- Dual local/server portfolio modes can diverge.
- Global CSS plus multiple style layers can produce cascade coupling.
- The sizable feature set requires bundle and accessibility regression monitoring.
