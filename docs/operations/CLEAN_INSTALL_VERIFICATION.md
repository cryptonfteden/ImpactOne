# CLEAN_INSTALL_VERIFICATION.md — Phase RC2-STABILIZATION-001

Simulates objective 1 and objective 8: a completely fresh machine (no local state, no pre-existing `node_modules`, no assumptions) cloning this repository and starting it using only what's in git plus the repository's own documentation.

## Method

A real `git clone` of this local repository was made into a scratch directory (`%TEMP%\rc2_clean_clone`), `node_modules` was deleted from both the root and `frontend/`, and `npm install`/`npm ci` was run fresh in both, followed by an attempt to load the backend's actual route tree (`require("./backend/app.js")`) — the same module chain a real `node backend/server.js` boot exercises.

## Result — BEFORE this phase's fixes (cloned at commit `b9f6855`)

**FAILED.** Two sequential, real crashes, reproduced directly:

1. `node -e "require('./backend/app.js')"` → `Error: Cannot find module '.prisma/client/default'`, thrown from inside `@prisma/client`'s own entry file. Root cause: `npm install` does not generate the Prisma Client — `npm run db:generate` (`prisma generate`) must be run separately, and neither `ENVIRONMENT_SETUP.md`'s "Startup Sequence" section nor the repository's root `README.md` (which had no setup instructions of any kind) stated this as a hard prerequisite before the app can load at all — it was documented only under a "Running Database Migrations" heading, reading as optional/for-later.
2. After running `npm run db:generate` and retrying: `Error: Cannot find module './userRepository'`, thrown from `backend/services/authService.js:14`. Root cause: `backend/services/userRepository.js` — required unconditionally by already-committed `authService.js`/`accountService.js`, which are reached via the unconditional route-registration chain `server.js → app.js → routes/index.js → authRoutes.js → authController.js → authService.js` — had never been committed to git in any branch (confirmed via `git log --oneline --all` and `git ls-files`, both empty for that path). This is the same Critical finding independently proven in the immediately preceding `RC1-INDEPENDENT-VERIFICATION-001` audit.

## Result — AFTER this phase's fixes

Both root causes were fixed this phase (see `RC2_STABILIZATION_REPORT.md` for details):
- `backend/services/userRepository.js` committed (it already existed correctly on disk and was already covered by passing tests — this was a missing `git add`, not a rewrite).
- `README.md` and `ENVIRONMENT_SETUP.md` updated to state the `prisma generate` prerequisite explicitly, in the startup sequence itself, not just under a migrations heading.

Re-running the identical clean-clone procedure against the fixed working tree:

| Step | Command | Result |
|---|---|---|
| Clone | `git clone` | ✅ Succeeds |
| Root install | `npm install` (267 packages) | ✅ Succeeds, 0 errors |
| Root install (strict) | `npm ci` | ✅ Succeeds — package-lock.json is fully consistent with package.json |
| Frontend install | `npm install` (172 packages) | ✅ Succeeds, 0 errors |
| Frontend install (strict) | `npm ci` | ✅ Succeeds — lockfile consistent |
| Prisma Client generation | `npm run db:generate` | ✅ Succeeds |
| Backend module load | `require("./backend/app.js")` | ✅ Loads cleanly, no `MODULE_NOT_FOUND` |
| Backend live boot | `node backend/server.js` | ✅ Listens on port 5000, only the expected/documented dev-JWT-fallback warning |
| Health check | `GET /health/live`, `/health/ready`, `/health` | ✅ All three return correct real responses |
| Frontend live boot | `npm run dev` (Vite) | ✅ Ready in <1s, zero warnings |
| Frontend production build | `npm run build` | ✅ Succeeds, only pre-existing baseline warnings (see `RC2_STABILIZATION_REPORT.md`) |

## Conclusion

A genuinely fresh machine — clone, install, generate, configure `.env` from `.env.example`, migrate, run — can now boot this repository successfully using only what is committed to git and what the repository's own documentation states, with no reliance on any local/session-specific state. Before this phase, it could not, for two independently root-caused and now-fixed reasons.
