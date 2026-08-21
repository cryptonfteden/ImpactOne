# TradingView integration

## Current state

ImpactOne now has a secure first integration layer. It does **not** claim that TradingView is connected until every required item is actually present.

- Canonical strategy contract: `impactone-fibonacci-v1-draft`
- Anchor direction: chronological monthly/weekly low to a later high
- Active levels: `0`, `0.886`, `1`
- Approved approach zone: from `0%` through `5%` above the `0.886` point, approaching from above
- TradingView webhook: implemented with secret validation, freshness checks and deduplication
- Independent ImpactOne recalculation: implemented for every accepted alert
- Pine parity: pending the exact Pine source and verified examples
- Advanced Charts: pending TradingView library approval and local library files
- TradingView-compatible UDF datafeed: implemented at `/api/v2/integrations/tradingview/datafeed`

## Important distinction

A paid TradingView account is not automatically a market-data API license. TradingView Advanced Charts is supplied through an approved private repository, and the host application must provide its own datafeed. Pine Script also cannot run inside the chart library, so the strategy must be reproduced in ImpactOne and verified against TradingView examples.

## Environment variables

Add these values only to `backend/.env`; never commit secrets.

```env
TRADINGVIEW_WEBHOOK_SECRET=replace-with-a-long-random-secret
TRADINGVIEW_CHART_LIBRARY_ENABLED=false
TRADINGVIEW_CHART_LIBRARY_PATH=
```

## TradingView alert payload

After a public HTTPS webhook URL is available, create a TradingView alert that sends JSON in this contract:

```json
{
  "secret": "YOUR_WEBHOOK_SECRET",
  "symbol": "{{exchange}}:{{ticker}}",
  "event": "ENTERED_0886_ZONE",
  "timeframe": "{{interval}}",
  "price": {{close}},
  "barTime": "{{time}}"
}
```

Webhook endpoint:

```text
POST https://YOUR-PUBLIC-DOMAIN/api/v2/integrations/tradingview/webhook
```

Local status endpoint:

```text
GET http://127.0.0.1:5000/api/v2/integrations/tradingview/status
```

The UDF endpoints expose configuration, server time, symbol search, symbol resolution and verified OHLCV history. Only resolutions currently backed by real provider paths are advertised. Unsupported resolutions return an explicit error rather than synthetic candles.

An alert is inside the strategy zone only when its verified price is at the `0.886` point or no more than `5%` above it. A price below `0.886`, or more than `5%` above it, remains recorded as evidence but is marked `OUTSIDE_APPROVED_ZONE` and is not an approved setup.

## Remaining user-supplied inputs

1. TradingView Advanced Charts approval and the private library files.
2. The exact Pine Script source, inputs and alert conditions.
3. At least five golden examples: symbol, timeframe, low/high anchors, expected `0.886`, alert result and screenshot.
4. A long webhook secret.
5. A public HTTPS address for the backend before TradingView can deliver alerts.

## Acceptance gates

The integration may be labeled **connected** only when:

- webhook authentication succeeds;
- duplicate and stale alerts are rejected;
- ImpactOne recalculates the same anchors and `0.886` level;
- all golden examples match within the agreed price tolerance;
- the displayed symbol, timeframe, source and freshness metadata are correct;
- missing market data remains an explicit empty state;
- Advanced Charts loads from the approved local library and ImpactOne datafeed.
