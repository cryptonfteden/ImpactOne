# Impact Graph Spec — Phase X3

Implemented, tested, real. `backend/services/impactGraphService.js` + `frontend/src/components/ImpactGraph.jsx`. ImpactOne's signature feature.

## Data Model — No New Infrastructure

Built entirely on `WorldMemoryRecord` (the real, existing "spine" of one row per real-world occurrence) and `WorldMemoryCausalLink` (the real, existing, append-only causal-edge list — `effectRecordId`, `causeRecordId` (nullable), `explanation`, `confidence`, `methodologyVersion`), both from Sprint 21B's World Memory infrastructure. No new model was needed — this feature is a real read/traversal over data this codebase already had the shape for.

## Honest Current State — Verified Before Writing Any Code

**The real dev database has 0 causal links and 225 records today.** This was checked directly before implementation. It means the Impact Graph, run live against real production data right now, will honestly show "no causal chain recorded yet" for nearly every query. This is not a bug or a placeholder — it is the mission's own explicit requirement in action: *"Unknown relationships explicitly shown as unknown. Never fabricate links."* No example/demo data was seeded to make the feature look more populated than it is — that would be exactly the fabrication this whole engagement has refused to do at every prior phase.

## Three Real, Distinct States

| Status | Meaning | UI |
|---|---|---|
| `NO_DATA` | No `WorldMemoryRecord` mentions this symbol at all | "No causal chain recorded yet" — honest, not an error |
| `NODES_ONLY_NO_LINKS` | Real events exist, but no real `WorldMemoryCausalLink` connects them | "Events exist, but no causal chain yet" |
| `REAL_CHAIN` | At least one real causal edge exists | The interactive graph renders |

## Graph Construction

Given a symbol, seed nodes are every `WorldMemoryRecord` whose real `symbols` array mentions it. From there, a real breadth-first walk follows `WorldMemoryCausalLink` edges in both directions (what caused this, what this caused), bounded by `maxDepth` (default 3) and `maxNodes` (default 25) — exposed limits so a future densely-linked dataset can never return an unbounded graph. Every returned edge carries its real, stored `confidence` (a decimal) and `explanation` (free text) — never inferred, never averaged into a fabricated composite score.

## Unknown Relationships — Explicit, Not Hidden

`causeRecordId` is nullable in the real schema — an effect can genuinely have no recorded upstream cause yet (an honest "exogenous or not-yet-understood" state). Every response counts these (`unknownUpstreamCount`) and the UI renders them as a literal "Unknown — no upstream cause recorded yet" node, never silently dropped and never guessed at.

## Interactive & Expandable

`ImpactGraph.jsx` renders each edge as a collapsed node by default; clicking expands it to reveal its real confidence badge, real explanation, and real upstream cause (or the honest "unknown" state). This matches the mission's example shape (a linear chain: cause → effect → cause → effect) while staying a real, data-driven rendering, not a hardcoded illustration.

## API

`GET /api/v2/impact-graph/:symbol` → `{ symbol, generatedAt, nodes[], edges[], status, message, unknownUpstreamCount, truncated }`.

## Tests

6 tests (`impactGraphService.test.js`): symbol validation, honest `NO_DATA`, honest `NODES_ONLY_NO_LINKS`, a real graph built from real seeded causal links with real confidence/explanation preserved, explicit unknown-upstream disclosure, and bounded traversal (`maxNodes`) proven against 40 real linked records. 5 frontend tests (`ImpactGraph.test.jsx`) covering all three states, expand/collapse interaction, and a real error state.
