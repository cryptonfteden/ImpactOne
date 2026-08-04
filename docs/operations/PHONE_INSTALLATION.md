# Phone Installation — PHONE-INSTALLATION-001

Technical reference for deploying ImpactOne so it can be installed as a PWA on a real phone. For the founder-facing walkthrough, see `FOUNDER_INSTALL_GUIDE.md`. For what was and wasn't verifiable in this environment, see `REAL_DEVICE_VERIFICATION.md`.

## Prerequisites

1. Backend deployed and reachable over a real, public HTTPS origin (see `DEPLOYMENT_CHECKLIST.md` / `ENVIRONMENT_SETUP.md` — unchanged by this phase).
2. Frontend built with `VITE_API_BASE_URL` set to that real backend origin (e.g. `https://api.yourdomain.com/api`) — **not** the `.env` default of `http://localhost:5000/api`, which only works on a dev machine.
3. Frontend's static build (`frontend/dist/`) hosted over HTTPS. A PWA's service worker and install prompt both require a secure origin (`localhost` is the one exception Chrome allows for local dev — a real phone needs real HTTPS).

## Build Steps

```bash
cd frontend
VITE_API_BASE_URL=https://api.yourdomain.com/api npm run build
```

This phase added a real startup check for this exact step: if the resulting production build's `VITE_API_BASE_URL` is missing or still resolves to `localhost`/`127.0.0.1`, `startupValidation.js`'s `validateOrigins()` reports it as a real startup issue (visible in the browser console / Health Dashboard, per the app's existing non-blocking validation convention) instead of the app silently failing every request on a real device.

Deploy the contents of `frontend/dist/` to any static HTTPS host reachable from a phone (the existing infrastructure — no new hosting mechanism was introduced this phase).

## What Makes This Installable

Already present, verified unchanged and correct this phase:

- `frontend/public/manifest.json` — real `name`/`icons`/`display: standalone`/`start_url`/`scope`.
- `frontend/public/sw.js` — registered in production only (`registerServiceWorker.js`), caches the real app shell + hashed build assets, never caches API responses.
- Real icon files: `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`.

## Verifying the Deployment Before Handing It to the Founder

1. Open the deployed HTTPS URL in Chrome (desktop or Android) and confirm dev tools' Application panel shows the manifest with no errors and the service worker as "activated and running."
2. Confirm `GET <your-api-origin>/health/live` returns `200` from the real deployed backend.
3. Load the deployed frontend URL and confirm Home actually shows real data (not an error state) — this is the real, end-to-end proof that `VITE_API_BASE_URL` was set correctly at build time.
4. Only then hand the URL to the founder — see `FOUNDER_INSTALL_GUIDE.md`.

## Updating a Live Install

Rebuild and redeploy `frontend/dist/` as usual. The already-existing service-worker update mechanism (see `PWA_DEPLOYMENT_REPORT.md`'s "Update Safety" section) takes care of the rest: the next time the installed app is opened with network access, the new worker installs in the background and a real "Reload to update" banner appears — no reinstall, no manual cache-clear, and no risk of the user being stuck on a broken stale version indefinitely.
