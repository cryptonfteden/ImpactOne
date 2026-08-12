# 11 — Component Library

## Shared foundations

Buttons, cards, fields, inputs, containers, grids, stacks, spacers, pages, panels, sections, badges, skeletons, loading indicators, and safe values appear across general and NOVA component directories.

## Intelligence components

`HeroCard`, `IntelligenceCard`, `RecommendationCard`, `FeedItemCard`, `DailyBriefHero`, `DailyBriefArchive`, `MarketContextStrip`, `PriorityIntelligenceCards`, `QualityScoreBreakdown`, `AttentionLevelBadge`, `ImpactGraph`, `AdvancedChart`, `ScenarioComparison`, and `StockSidePanel`.

## Workflow and shell components

Header, navigation, notification center, workspace detail, portfolio risk panel, watchlist priority panel, Ask ImpactOne panel, feedback widget, welcome overlay, offline/update/demo banners, application and screen error boundaries.

## Component contract

Shared components should accept explicit data, loading, empty, unavailable, and error states; avoid fetching their own unrelated domain data; expose accessible labels and focus behavior; and render provenance/freshness where financial intelligence is shown.

## Verification

Many high-value components have adjacent Vitest tests, including recommendation, graph, chart, notification, workspace, error-boundary, and NOVA primitive coverage. Visual regression coverage is not evident from CI.
