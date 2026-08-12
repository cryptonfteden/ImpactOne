# 07 — Data Pipeline

## Primary flow

```text
External providers
  -> provider adapters and fetchers
  -> normalization / envelopes
  -> cache, quality, freshness and provenance checks
  -> canonical events and Intelligence Bus
  -> agents / committee / claims / scenario / recommendations
  -> PostgreSQL ledgers and snapshots
  -> controllers and APIs
  -> React screens and notifications
```

## Sources observed

Finnhub, Polygon, Alpha Vantage, Yahoo-derived price history, SEC EDGAR, FRED, Federal Reserve/FOMC, Treasury, ECB, CFTC COT, FINRA, SPDR, FDA, NASA, Polymarket, CoinGlass, Reddit/X/Telegram-related adapters, analyst sources, news providers, and optional options-flow providers. Availability depends on environment keys and provider terms.

## Data controls

- Provider registry, inventory, health, metrics, diagnostics, run logs, cache, retry, and failure-taxonomy modules.
- Canonical event envelopes and deduplication keys.
- Freshness analyzers, quality scorecards, evidence matrices, and source scoring.
- Redis TTL configuration for provider and price-history caching; graceful no-cache mode when Redis is absent.
- Append-oriented snapshots for themes, sentiment, sources, performance, and outcomes.

## Failure behavior requirements

Provider failures must remain distinguishable from valid empty results; stale values require timestamps; partial evidence must lower confidence; cache provenance must be retained; provider substitution must not silently change methodology.
