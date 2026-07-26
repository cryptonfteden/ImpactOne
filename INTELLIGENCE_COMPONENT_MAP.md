# Intelligence Workspace — Component Map

Every visual element in `frontend/src/screens/IntelligenceWorkspaceScreen.jsx` traced to its certified NOVA source. No component on this page was created new — this phase reused the existing NOVA library (Phase X12B/X12C.0) exclusively.

## Layout primitives (`frontend/src/components/layout/`)

| Component | Used for |
|---|---|
| `Page` | Screen root; carries `dir` from `useI18n()` |
| `Container` | Centers/caps content width |
| `Grid` | 12/8/4-column responsive grid — KPI-style Market Impact Map cards (`gridColumn: "span 4"`) |
| `Stack` | Vertical/horizontal flex rhythm throughout (header block, badge rows, list rows) |

## NOVA components (`frontend/src/components/nova/`)

| Component | Section(s) | Notes |
|---|---|---|
| `Card` | All 7 sections + Market Impact Map's per-sector sub-cards | `title`/`eyebrow` prop is the section/sector's single title — never duplicated in the body (per the X12C.1.1 review lesson) |
| `Badge` | Priority Events (severity, direction), Market Impact Map (impact tone), Source Evidence (reliability), Saved/Tracked Items (alert status), Recent Intelligence (impact tone) | `tone` always derived from a real field (`riskLevel`, `impactType`, alert `status`) — never a hardcoded tone |
| `ConfidenceBadge` | Intelligence Brief | Wraps the real `confidence` field in the shared 4-band vocabulary (§11) |
| `EvidenceBadge` | Market Impact Map, Source Evidence | Count = real `explainability.evidence.length`, never a guessed number |
| `AiConfidence` | Market Impact Map | Confidence bar + badge off the sector's representative event's real `confidence` |
| `Table` | Priority Events | Real `<table>`/`<th>`/`<td>` — native accessible table semantics |
| `Tabs` | Recent Intelligence | Client-side filter (All/Opportunity/Risk/Neutral), `role="tablist"`/`role="tab"` for free |
| `EmptyState` | Every section's "no data" branch | Consistent honest-empty-state pattern across the whole screen |
| `Skeleton` | Loading state, Saved/Tracked Items while `folders`/`alerts` are still `null` | Distinguishes "still loading" from "loaded and empty" |
| `Alert` | Error banner (load failure) | `tone="error"`, replaces any legacy `.negative` text class |

## Typography (`frontend/src/styles/typography.css`)

`nova-heading-eyebrow`, `nova-heading-h1`, `nova-heading-subtext`, `nova-text-sm`, `nova-text-xs` — no legacy `.eyebrow`/`.company-description`/`.subtle` classes anywhere in this screen (enforced by an automated test).

## Explicitly NOT used / NOT created

- No new component was added to `components/nova/`. Every requirement was met by composing existing exports.
- No legacy classes: `.company-description`, `.eyebrow`, `.ghost-button`, `.pill`, `.stack-list`'s container div wrapper is still used for simple bullet lists (it is a layout/indentation class, not a typography helper, and its one physical-property defect — `padding-left`, unrelated to this screen — was already fixed in Phase X12C.1.1).
- No duplicate of `GlobalIntelligenceScreen.jsx`'s own JSX/markup — Intelligence Workspace shares the same NOVA component vocabulary as Mission Control (X12C.1) and the NOVA Showcase (X12C.0), not the older screen's `SectionCard`/`analysis-grid`/`heatmap-grid`/`news-list` classes.

## File inventory

| File | Role |
|---|---|
| `frontend/src/screens/IntelligenceWorkspaceScreen.jsx` | The screen |
| `frontend/src/screens/IntelligenceWorkspaceScreen.test.jsx` | Tests |
| `frontend/src/features/intelligenceWorkspace/IntelligenceWorkspaceFeature.jsx` | Thin feature wrapper (matches every other screen's registration pattern) |
| `frontend/src/features/index.js` | Exports `IntelligenceWorkspaceFeature` |
| `frontend/src/layout/screenRegistry.js` | `screenMap["Intelligence Workspace"]` |
| `frontend/src/layout/Sidebar.jsx` | `ADVANCED_ITEMS` entry (collapsed "More tools" group — Home, Mission Control, and the 5-item bottom nav are all untouched) |
| `frontend/src/i18n/locales/en.json` | `nav.intelligenceWorkspace` + full `intelligenceWorkspace.*` string namespace |
