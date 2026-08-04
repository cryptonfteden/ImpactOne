# World Data Layer — DATA-VISUALIZATION-001

How real backend data reaches the 3D world, end to end, and the performance/correctness guarantees along the way. Complements `VISUALIZATION_ARCHITECTURE.md` (component structure) and `FLAGSHIP_IMPLEMENTATION.md` (the original data-fetching design).

## The One Real Data Source

Every visualization in this phase — and every panel before it — traces back to exactly one hook: `useFlagshipData.js` (built in `FLAGSHIP-SCREEN-001`, untouched this phase). It issues the same 10 real backend calls it always has, fault-isolated via `Promise.allSettled`. This phase adds **zero new calls** — every new visualization reads a field that was already being fetched for its corresponding panel's own text content:

| Real API call (unchanged) | Already powers | Now also powers |
|---|---|---|
| `recommendationsApi.list({ status: "ACTIVE" })` | AI Recommendations panel text | `CompanyClusters`, the AI recommendation beam (prior phase) |
| `committeeIntelligenceApi.convene(symbol)` | Agent Consensus panel text | `AgentConstellation`, `ConfidenceHalo` |
| `claimsApi.listActive({ limit: 8 })` | Global Events panel text | `ClaimNetwork` |
| `claimsApi.listOvernightChanges({ limit: 8 })` | Breaking News panel text | `HistoricalTimeline` |
| `portfolioEngineApi.getPerformanceDelta()` | Portfolio Health panel text | Portfolio energy pulses (prior phase, unchanged) |

## Data Freshness

Every visualization reflects exactly the same data, at exactly the same freshness, as its corresponding panel's own text — there is no separate polling, caching, or staleness window introduced for the 3D visualizations. When `useFlagshipData` refreshes (its own existing `useEffect`, keyed on the watchlist), every visualization re-renders with the new real data in the same React commit as the panel text itself. This is a deliberate consequence of the layering in `VISUALIZATION_ARCHITECTURE.md`: because the visualizations are pure presentation of props passed down from the same single fetch, there is no code path where a visualization could show older or newer data than its panel.

## Honest Defaults for Missing/Loading Data

Every new prop passed into `DataVisualizationLayer.jsx`'s exports defaults to an honest "nothing yet" value rather than a fabricated placeholder:

- `recommendations`, `claims`, `breakingNewsItems` default to `[]` — an empty cluster/network/timeline, not a fake one.
- `committee` defaults to `null` — `AgentConstellation` renders nothing at all (an explicit early return) rather than an empty ring with no members.
- `cioConfidence` defaults to `undefined` — `confidenceToIntensity` (in `visualizationMappings.js`) maps this to the lowest real intensity bucket, matching the same "unrecognized/missing confidence is never assumed to be high" honesty rule already established for the panel content itself.

## Performance Guarantees

Every new visualization has a **fixed upper bound on draw calls**, independent of real data volume:

- `CapitalFlowLines`: exactly `FLAGSHIP_PANELS.length` (10) pulse spheres, always — one per panel, never per data item.
- `CompanyClusters`, `ClaimNetwork`, `HistoricalTimeline`: capped at `MAX_CLUSTER_ITEMS = 6` each, regardless of how many real recommendations/claims/overnight-changes actually exist.
- `AgentConstellation`: capped at `MAX_COMMITTEE_MEMBERS = 9` — in practice this codebase's real committee has a fixed member roster (`COMMITTEE_MEMBERS` in `intelligenceCommitteeService.js`), so this cap is a safety bound, not an active truncation in normal operation.
- `ConfidenceHalo`, `ImportancePulse`: exactly one mesh each, always.

Total worst-case addition from this phase: 10 (flow) + 6 (clusters) + 9 (constellation) + 1 (halo) + 6 (claims) + 6 (timeline) + 1 (importance) = 40 small, low-poly meshes/lines, all sharing cheap `meshBasicMaterial`/`Line` primitives already used elsewhere in this scene (no new material types, no new shaders). This is well within the same performance envelope already established and verified across the four prior phases in this line (see `PERFORMANCE_NOTES.md`, `PERFORMANCE_REVIEW.md`).

## No Duplicated Fetching, No Duplicated Rendering

- **No duplicated fetching**: confirmed above — zero new API calls.
- **No duplicated rendering**: confirmed in `VISUALIZATION_ARCHITECTURE.md`'s final section — the existing panel-line/node rendering loop in `FlagshipEarthScene.jsx` was not touched; new visualizations only add to the scene, never re-render what already existed.

## What Remains Real, Not Simulated

Every color, size, position, and animation speed in this phase's new visualizations traces to a specific, named real field documented in `DATA_VISUALIZATION.md`'s mapping table — there is no random-number-driven "looks busy" simulation anywhere in this phase's code, consistent with the "no idle movement without meaning" rule established in `IMMERSIVE-INTERACTIONS-001` and re-applied here to every new element.
