# Intelligence Workspace

Phase X12C.2. The AI intelligence desk for global markets — `frontend/src/screens/IntelligenceWorkspaceScreen.jsx`, reachable from Sidebar → More tools → "Intelligence Workspace" (also `screenMap["Intelligence Workspace"]`).

## What it is

A single command surface over the same live intelligence pipeline `GlobalIntelligenceScreen.jsx` already reads (`intelligenceApi.overview()`), but surfacing a different set of fields from that same real payload: severity, time horizon, per-sector impact, source reliability, evidence counts, reasoning, counter-scenarios, and invalidation signals — the parts of the feed item object Global Intelligence doesn't currently render. It is **not** a news feed: no section is a plain reverse-chronological list without a stated confidence, severity, or evidence trail attached.

`GlobalIntelligenceScreen.jsx` was not modified in any way. Both screens are independently reachable and read the same backend endpoint; this is intentional reuse of an existing, already-tested data source, not a duplicate feature.

## Data sources (all pre-existing, no new backend endpoint)

| Source | Used for |
|---|---|
| `intelligenceApi.overview({ watchlist, scenarios, sessionType })` | `feed[]` — every section except Saved/Tracked Items |
| `watchlistFoldersApi.list()` | Saved/Tracked Items — folders + pinned symbols |
| `priceAlertsApi.list()` | Saved/Tracked Items — active price alerts |

The feed item shape (`backend/services/autonomousMarketService.js`, `processEvent`) already carries every field this screen needs: `confidence`, `importanceScore`, `riskLevel`, `affectedSectors`, `impactType`, `timeHorizon`, `reliability`, `sourceName`, `publishedAt`, `marketImpactPrediction`, and a nested `explainability: { reasoning, evidence[], counterarguments[], invalidationSignals[] }`. Nothing here is computed or invented client-side beyond simple sorting/grouping of these existing fields (see "No fabricated metrics" below).

## Required sections → real field mapping

1. **Intelligence Brief** — the single highest-`importanceScore` feed item ("top event"). AI summary = `whyItMatters`; confidence = `ConfidenceBadge` off `confidence`; last updated = `publishedAt`; primary market implication = `marketImpactPrediction`.
2. **Priority Events** — feed sorted by `importanceScore` descending, top 6, in a NOVA `Table`: headline, severity (`riskLevel`), affected sectors (`affectedSectors`), expected direction (`impactType`), time horizon (`timeHorizon`).
3. **Market Impact Map** — feed items grouped by sector (from `affectedSectors`); each sector shows the single highest-importance event mentioning it: impact tone (`impactType` → positive/negative/neutral), confidence (`AiConfidence` off `confidence`), evidence count (`explainability.evidence.length`, via `EvidenceBadge`).
4. **Source Evidence** — top 6 feed items: source name (`sourceName`), publish time (`publishedAt`), reliability (`reliability` — the only real per-item source-quality field; there is no numeric source-trust score in the API response, so none is fabricated here), evidence count.
5. **AI Analysis** — the same top event's `explainability`: reasoning summary (`explainability.reasoning`), uncertainty (`100 - confidence`, explicitly labeled "inverse of stated confidence" so it's never mistaken for a separately-modeled uncertainty metric), counter-scenario (`explainability.counterarguments[]`), what would change the conclusion (`explainability.invalidationSignals[]`).
6. **Recent Intelligence** — the full feed, filterable client-side via NOVA `Tabs` (All / Opportunity / Risk / Neutral) over the already-fetched `impactType` field. No new backend query parameter — filtering is entirely local, over data `intelligenceApi.overview()` already returned in one call.
7. **Saved / Tracked Items** — `watchlistFoldersApi.list()` folders (name + symbol count) and `priceAlertsApi.list()` alerts (symbol, direction, target, status). Honest `EmptyState` when both are empty — never a placeholder folder or alert.

## No fabricated metrics

- **Expected direction** uses the real `impactType` field (`opportunity`/`risk`/`neutral`) — there is no `bullish`/`sell`/`hold` field anywhere in the backend, so the screen never invents one (confirmed by reading `autonomousMarketService.js`, `marketPositioningService.js`).
- **Uncertainty** is explicitly `100 - confidence`, labeled as such — not a separate uncertainty model that doesn't exist in the API.
- **Source quality** uses `reliability` (`"high"|"medium"|"developing"`), the one real per-item field — not the backend's `sourceQualityScore()` heuristic (which is a curated-outlet lookup, not exposed via this API response, and explicitly commented in the backend as "a heuristic, not a fabricated precision score" — left out entirely rather than re-derived client-side).
- **Market Impact Map**'s per-sector card shows one real event's own confidence/impact/evidence — never a synthesized cross-event average, which would be a new, invented number.
- Empty/loading/error states never substitute a zero or placeholder value for missing data (see Mission Control's X12C.1.1 review lesson, applied here from the start): Portfolio-Risk-style "0/100 standing in for absent data" mistakes do not appear anywhere in this screen.

## Responsive / RTL / Accessibility / Tokens

- Layout: NOVA `Grid`/`Stack`/`Container`/`Page` primitives only (12/8/4-column breakpoints, unchanged from X12B/X12C.1).
- RTL: root `Page` receives `dir` live from `useI18n()`; all spacing via logical-property NOVA primitives; no physical left/right property was introduced (grep-verified).
- Accessibility: every section is `<section aria-label="...">` (ARIA region); NOVA `Tabs` provides native `role="tablist"`/`role="tab"` with `aria-selected`; the Priority Events table is a real `<table>` with `<th>`/`<td>`; loading state sets `aria-busy="true"`.
- Typography/tokens: exclusively NOVA classes (`nova-heading-eyebrow`, `nova-heading-h1`, `nova-heading-subtext`, `nova-text-sm`, `nova-text-xs`) and NOVA components (`Card`, `Badge`, `ConfidenceBadge`, `EvidenceBadge`, `AiConfidence`, `Table`, `Tabs`, `EmptyState`, `Skeleton`, `Alert`). Zero legacy classes (`.company-description`, `.eyebrow`, `.ghost-button`, `.pill`) — verified by an automated test asserting zero matches in the rendered DOM.

## What was intentionally left out

- No new "what-if" category-exclusion UI (`explainabilityApi.whatIf`) — that requires a symbol-selection interaction this phase didn't ask for; the counter-scenario/invalidation requirement is already satisfied honestly by the feed item's own `explainability` fields.
- No committee/evidence-matrix data (`marketIntelligenceApi`, `committeeIntelligenceApi`) — several of those categories are explicitly fixture-backed (`isFixture: true`) per the research for this phase, and surfacing them here without a fixture-aware disclosure UI risked presenting mocked data as live, which the "no fabricated metrics" requirement rules out.
