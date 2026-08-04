# Phone Installation Result — FOUNDER-DEPLOYMENT-001

This is the result record for this phase's phone-installation objectives, following on directly from `PHONE-INSTALLATION-001`'s `PHONE_INSTALLATION.md`/`FOUNDER_INSTALL_GUIDE.md`. No PWA mechanism changed this phase — this phase's own real contribution is the production API-origin evidence in `DEPLOYMENT_VERIFICATION.md` (items 5, 12–15), which this result record summarizes for the founder-facing side.

## Method (Disclosed Honestly)

No physical Android phone, browser, or device lab is available in this environment, exactly as disclosed in `PHONE-INSTALLATION-001`'s `REAL_DEVICE_VERIFICATION.md`. This record does not re-claim anything that phase already marked as unverifiable — it re-confirms the manifest/service-worker code is unchanged and correct, and adds the one new piece of real evidence this phase produced: proof that the production build actually embeds whatever real API origin is set at build time (not a rebuild of the mechanism — a real execution of it).

## Result Per Objective

| Objective | Result |
|---|---|
| Installation on Android Chrome | **Not completed — requires the founder's real phone.** Manifest fields remain code-verified correct and unchanged (`name`, `icons`, `display: standalone`, `start_url`, `scope`). |
| Login and session persistence in standalone mode | **Partially completed.** The persistence mechanism (`localStorage`-based beta identity, origin-scoped, survives app relaunch by browser design) is code-verified. Confirming it in an actual installed standalone window on a real device is not completed — requires the founder's phone. |
| Real API data in the installed application | **Not completed as an end-to-end device test — requires both a live deployed backend and the founder's phone in the same session.** What *is* now real evidence: a production build with `VITE_API_BASE_URL` set to a real HTTPS origin embeds exactly that origin in the shipped JS bundle (verified by grepping the actual built file — see `DEPLOYMENT_VERIFICATION.md` item 5), and a build without it embeds `localhost:5000/api` instead, which `validateOrigins()` catches as a real startup issue. This is the mechanical proof that the app *will* reach real data once a real backend URL and a real phone are both in place — the missing piece is exclusively the hosting/device pairing, not the code. |
| Portrait and landscape use | **Not completed — requires the founder's real phone.** Media-query code for both orientations is code-verified present and unchanged from `MOBILE-FIXES-001`. |

## What Would Close These Out

1. An operator deploys the backend to a real HTTPS origin and the frontend (built with that real `VITE_API_BASE_URL`) to a real HTTPS static host.
2. The founder opens that real URL in Android Chrome on their own phone and follows `FOUNDER_INSTALL_GUIDE.md`'s install steps.
3. Someone with that phone in hand walks through `REAL_DEVICE_VERIFICATION.md`'s objective table and `DEPLOYMENT_VERIFICATION.md`'s items 12–15, replacing each "requires real phone" row with the real observed result.

None of that can happen inside this environment — it requires operator hosting decisions and physical device access this session does not have.
