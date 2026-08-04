# Methodology Versioning (Phase X11 — Part 3)

## What it is

An immutable, auditable record of every real scoring-weight change this phase's learning systems (Outcome Feedback Loop, Dynamic Source Scoring) can introduce. Both `outcomeFeedbackService.js` and `dynamicSourceScoringService.js` resolve their active methodology version from here before persisting any audit row, falling back to a disclosed baseline string when no version has been recorded yet.

## Files

- `backend/services/methodologyVersioningService.js` — `recordVersion()`, `getActiveVersion()`, `listVersions()`, `rollbackToVersion()`.
- `backend/controllers/methodologyVersioningController.js`, `backend/routes/methodologyVersioningRoutes.js` — mounted at `GET/POST /api/v2/methodology-versions` and `POST /api/v2/methodology-versions/:version/rollback`.
- New Prisma model: `MethodologyVersion` (append-only, `isActive` is the only field ever updated, and only by rollback).

## What every version records

`version` (unique), `reason`, `evidence` (real JSON — sample sizes, hit rates, whatever justified the change), `affectedModels` (a real array — e.g. `["autonomousRecommendationEngine"]`), `expectedImpact` (a plain-language statement of what should change).

## Rollback

`rollbackToVersion(targetVersion)` never edits or deletes the version being rolled back to, or the version being rolled back from. It:

1. Marks every currently-active version inactive (`isActive: false`, `rolledBackAt`, `rolledBackFrom` set).
2. Creates a **new** version row (`{targetVersion}-rollback-{timestamp}`) that carries the target version's real evidence/affected-models/expected-impact forward as its own — restoring the old behavior without rewriting history.

## Tests

`backend/services/methodologyVersioningService.test.js` — 4 tests: required-field validation, immutable duplicate-version rejection, real active-version lookup scoped by affected model, and a rollback that deactivates without touching the original rows' data.
