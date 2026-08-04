# Rollback Plan — Private Beta

## Scope of this release

Sprints 33–34: mobile navigation, installable PWA (manifest, service worker, icons), onboarding back-nav, Daily Feed disclosure, offline/resilience handling, one frontend-only recommendation-timeline diffing fix, and CSS/layout fixes. **No backend route, controller, or database schema changed in either sprint** (verified by diffing each sprint's commits against `backend/routes/` and `backend/controllers/` — zero matches both times). This means a rollback of this release is a **frontend-only** operation; no migration reversal is needed.

## How to roll back

1. **Identify the last-known-good commit** before this release. Sprint 33 starts at `e8af43d` (PWA installability); Sprint 34 starts at `c48940f`. The commit immediately before `e8af43d` (`56205f3`, the Sprint 32 report) is the last commit before any Sprint 33/34 change.
2. **Revert, don't reset**, to preserve history: `git revert --no-commit <oldest-sprint-33-commit>^..<newest-sprint-34-commit>` then commit, or cherry-pick a `git checkout <last-known-good-commit> -- frontend/` for a faster but less traceable rollback.
3. **Rebuild and redeploy the frontend only**: `cd frontend && npm run build`. The backend does not need to restart or redeploy, since nothing there changed.
4. **Service worker consideration**: because this release changes `frontend/public/sw.js` (cache version bumped `impactone-shell-v1` → `v2`), a rollback should also bump the cache version string again (e.g., to `impactone-shell-v1-rollback`) so already-installed clients don't keep serving the newer cached shell after the code reverts. Without this, a beta user who installed the app during this release could see stale (rolled-back-past) cached assets until they manually clear site data.
5. **No database action required.** No schema, migration, or data changes shipped in either sprint.
6. **No API consumers to notify.** No public/external API contract changed, so no downstream consumer coordination is needed.

## Fast, partial rollback (single-feature)

Because every change landed as small, scoped commits (10 commits in Sprint 33, ~9 in Sprint 34), a single problematic change can be reverted independently via `git revert <specific-commit-hash>` without touching the rest of the release — e.g., if only the offline banner is causing confusion, only its commit needs reverting.

## Verification after rollback

1. `cd backend && node --test --test-concurrency=1` (confirms backend is genuinely untouched and still green).
2. `cd frontend && npx vitest run && npm run build` (confirms the reverted frontend state is internally consistent).
3. Load the app in a browser and confirm the pre-release UI renders (desktop sidebar nav, no bottom nav, no offline banner, no update banner).
4. If the service worker cache version was bumped per step 4 above, do one hard-reload test to confirm no stale-shell artifacts remain.

## Who can execute this

Any engineer with repository write access and the ability to run the existing test/build tooling described above — no special credentials or infrastructure access beyond normal deployment access are required, since this is a pure code-level revert with no data-layer component.
