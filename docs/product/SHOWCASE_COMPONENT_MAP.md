# Showcase Component Map (Phase X12C.0)

Every real, reusable component in `frontend/src/components/nova/`, what section(s) render it, and which NOVA Foundation (X12B) primitive it's built on. No component in this table is implemented more than once.

| Component | File | Built on (X12B) | Rendered in |
|---|---|---|---|
| `Button` | `Button.jsx` | `components.css` tokens | Buttons, Navigation, Accessibility, Motion |
| `Field`, `TextInput`, `SearchInput`, `Select`, `Checkbox`, `Radio`, `Toggle`, `Slider`, `DatePickerPlaceholder` | `Field.jsx` | `components.css` tokens | Inputs, Motion (Toggle) |
| `Badge`, `confidenceBand`, `ConfidenceBadge`, `EvidenceBadge` | `Badge.jsx` | `components.css` tokens | Color System, Cards, AI Components, Data Visualization, Accessibility |
| `Card` | `Card.jsx` | `Panel` (layout primitive) | Cards, all 9 named variants (Default/Glass/AI/Recommendation/News/KPI/Portfolio/Expandable/Loading) are ONE component |
| `AiThinking`, `AiLearning`, `AiUpdated`, `AiMemory`, `AiConfidence`, `AiRecommendation` | `Ai.jsx` | `motion.css`'s `.nova-ai-thinking`, `Badge`'s `confidenceBand` | AI Components, Cards, Loading, Motion |
| `Table`, `Heatmap`, `ChartPlaceholder`, `Tooltip`, `Legend` | `DataViz.jsx` | `components.css` tokens | Data Visualization |
| `Breadcrumb`, `Tabs`, `Drawer`, `ContextMenu`, `FloatingPanel`, `TopBar`, `SidebarSample`, `useDisclosure` | `Navigation.jsx` | `Panel` (Drawer/ContextMenu/FloatingPanel), `components.css` tokens | Navigation |
| `Toast`, `Alert`, `Banner`, `InlineMessage` | `Notifications.jsx` | `components.css` tokens, shared tone vocabulary | Notifications, Loading (Banner) |
| `Skeleton`, `ProgressBar`, `EmptyState`, `OfflineBanner`, `ReconnectBanner` | `Loading.jsx` | `components.css`'s `.nova-skeleton` shimmer (reduced-motion aware) | Loading, Data Visualization (ProgressBar) |

## Layout primitives reused (not reimplemented) from X12B

`Page`, `Section`, `Container`, `Grid`, `Stack`, `Panel` — every showcase section is wrapped in `ShowcaseSection.jsx`, itself built from `Section`/`Stack` (no showcase-specific section-header component exists separately from this one).

## Composition rule enforced throughout

No section file defines its own button, card, or badge markup — every section imports from `components/nova` (or `components/layout`) exclusively. This was verified by grep: zero `<button className="nova-button"` or `<div className="nova-panel"` literal usages exist inside `frontend/src/features/novaShowcase/sections/*.jsx` — every such element is reached through a component, never inlined.

## Design-token consumption

Every component in the table above is styled entirely through `frontend/src/styles/components.css`, which in turn references only `tokens.css`/`theme.css` custom properties (see `NOVA_SHOWCASE.md`'s "No hardcoded values" section for the verification method).
