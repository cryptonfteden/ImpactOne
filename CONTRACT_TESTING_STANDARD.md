# Contract Testing Standard — Phase PLATFORM-ARCH-001

**Status:** Architecture only. This defines a mandatory testing discipline, not an implementation.

## The exact defect this standard exists to prevent

Live-confirmed in the Portfolio Workspace review: the screen's own test suite (`PortfolioWorkspaceScreen.test.jsx`) mocked `recommendationsApi.list()` to return `{ heldPosition: { symbol, quantity } }` — a shape matching what the **screen's code** expected, not what the **real backend** (`GET /api/v2/recommendations`) actually returns (`portfolioContext` / `explanation.affectedPositions`, never a top-level `heldPosition`). All 12 tests passed. The real integration was broken in production the entire time. This is not a one-off mistake — it is a structural gap: nothing in this codebase's testing discipline today prevents a test fixture from encoding an assumption instead of a fact.

## The standard

### 1. Schema fixtures generated from canonical contracts, never hand-written per test

Every backend response shape that more than one consumer depends on (`Recommendation`, `portfolioEngineService.getSummary()`'s shape, the Options Agent's `OptionsSignal`, the Capability Registry's `Capability` shape, `heldPositionResolver`'s `HeldPositionMap`) gets **one** canonical schema definition, checked in once, in one place. Every test fixture for that shape — frontend mock or backend integration test — is generated *from* that one schema, never hand-typed as a fresh object literal per test file.

- This directly targets the root cause: `PortfolioWorkspaceScreen.test.jsx`'s fixture was hand-written to match the screen's own assumption. A schema-generated fixture cannot encode a field the schema doesn't define — `heldPosition` would never have appeared in a fixture generated from the real `Recommendation` schema, because it doesn't exist in that schema.
- Practically: one schema module per canonical contract (mirroring `eventEnvelope.js`'s existing `REQUIRED_FIELDS` pattern, generalized to every canonical shape, not just the Event Envelope), with a fixture-builder function every test imports rather than constructs by hand.

### 2. Consumer-driven contract tests

Every consumer (a frontend screen, or a backend service that reads another service's output) declares, in one place, exactly which fields of a producer's contract it depends on. A single test suite — run against the producer's *real* schema, not the consumer's assumption of it — verifies every declared dependency still exists and has the expected type. This is the mechanism that would have failed loudly, at the correct layer, the moment `PortfolioWorkspaceScreen.jsx` was written to depend on a `heldPosition` field: the consumer's own declared-dependency test would have failed against the real `Recommendation` schema immediately, before the screen ever shipped.

- Ownership: the schema lives with the **producer** (e.g., the `Recommendation` schema lives next to `autonomousRecommendationRepository.js`); the dependency declaration lives with the **consumer** (e.g., `PortfolioWorkspaceScreen`'s own declared dependency file lists `portfolioContext`, not `heldPosition`).
- This is deliberately lighter-weight than a full Pact-style broker — a single shared schema module plus a per-consumer dependency manifest is proportionate to this codebase's current scale (a single-repo monolith, not distributed microservices), while still closing the exact gap that caused the real bug.

### 3. Runtime validation, not just test-time validation

A canonical schema is validated at **response-build time** in non-production environments (dev/test), not only inside test files — the real API response is checked against its own declared schema before it leaves the server, and a controller-level assertion throws (loudly, in dev/test only, never silently in production) if a field the schema requires is missing, or if an undeclared field slips in unexpectedly. This catches drift that a merely-static test suite could miss if a schema itself gets edited without its dependent fixtures being regenerated.

### 4. CI failure rules

- A build **must fail** if any consumer's declared dependency manifest references a field not present in the producer's current canonical schema — this is a blocking, not advisory, check, run on every PR/commit that touches either the schema or a consumer.
- A build **must fail** if a canonical schema changes (a field renamed, removed, or retyped) without every consumer manifest that references it being updated in the same change — this prevents the inverse failure mode (a producer silently breaking a consumer it doesn't know about).
- A build **must fail** if a new hand-written mock object is added for a canonical shape instead of using the schema-generated fixture builder — enforced via a lint rule scoped to test files, not a manual review step that can be skipped under deadline pressure (exactly the condition under which the original bug shipped).

### 5. Provenance validation

Every fixture — schema-generated or otherwise — must carry the same `provenance` concept the Capability Registry defines (`live` / `fixture` / `fallback` / `none`). A test that exercises a "live" code path may never silently substitute fixture data without that substitution being visibly labeled in the test's own name/description (e.g., `"...against a fixture, not a live vendor"`) — this generalizes the codebase's existing `source: "fallback"` discipline (`altDataService.js`) from a runtime-data convention into a testing convention, so a reviewer scanning test names alone can tell which tests exercise real integration risk and which don't.

## Why this is proportionate, not process-heavy

This standard adds exactly one new artifact per canonical contract (a schema module + a fixture builder) and one new artifact per consumer (a dependency manifest) — not a new framework, not a new test runner, not a broker service. It is scoped specifically to the failure mode this platform has now demonstrated at least once concretely: a test fixture encoding a screen's assumption rather than the producer's reality. Every other testing practice already in place (Vitest, `node --test`, the existing integration-test-against-a-real-test-database pattern) stays exactly as-is.
