# ImpactOne Project Status — Historical Snapshot

> **Do not use this file as the current product or live-data status.** It records an early AI Analysis milestone and still mentions superseded details such as Yahoo Finance chart data. The maintained source of truth is [PROJECT_ONE_PAGER.md](PROJECT_ONE_PAGER.md), last reviewed 2026-08-09. Provider availability is also described there; unconnected patents, Telegram, Reddit and paid/licensed sources remain explicitly deferred.

## 1. What was built today
- Built a working AI Analysis experience for US stock tickers.
- Connected the frontend to a live backend quote endpoint.
- Added live quote metrics, company profile details, recommendation reasoning, recent company-specific news, and a chart area based on real historical data.
- Added favorites support with localStorage persistence and sidebar access.
- Verified the frontend production build successfully.

## 2. Current frontend features
- Dark fintech-style dashboard shell.
- Sidebar navigation between main app sections.
- AI Analysis screen with ticker search.
- Live market snapshot for the selected ticker.
- Company information card.
- Recommendation card with reasoning.
- Price chart rendering from historical price data.
- Recent news section tied to the selected ticker.
- Fear & Greed sentiment card.
- Favorites management with localStorage persistence.
- Loading spinner during analysis requests.
- Error messaging for invalid or unavailable tickers.

## 3. Current backend features
- Express-based backend server.
- API routing for quote and analysis-related data.
- Finnhub-backed quote and profile retrieval.
- Recommendation lookup from Finnhub.
- Company-news lookup for ticker-specific stories.
- Historical price data retrieval for chart generation.
- 60-second response caching for quote analysis requests.
- Basic error handling for missing/invalid API credentials and invalid tickers.

## 4. APIs connected
- Finnhub API
  - Quote data
  - Company profile data
  - Analyst recommendation data
  - Company news data
  - Metric data such as market cap, P/E, 52-week high/low, and volume
- Yahoo Finance chart endpoint
  - Historical daily price data for the chart
- Alternative.me Fear & Greed API
  - Market sentiment index

## 5. Environment variables needed
- FINNHUB_API_KEY
- Optional future variables may include:
  - OPENAI_API_KEY
  - POLYGON_API_KEY
  - NEWS_API_KEY
  - ALPHA_VANTAGE_API_KEY

The backend currently looks for the environment values from the project root or the frontend environment file.

## 6. How to run frontend
From the project root:

```bash
npm --prefix frontend run dev
```

Then open:

```text
http://127.0.0.1:5175/
```

## 7. How to run backend
From the project root:

```bash
npm run server
```

The backend runs on port 5000 by default.

## 8. Known issues
- The chart and fear & greed data depend on external provider availability.
- Some Finnhub endpoints may return limited or empty data for certain tickers.
- The backend currently expects the API key to be present in the environment configuration.
- The app is still focused on the analysis workflow and has not expanded into additional production modules beyond the current feature set.

## 9. Next development priorities
- Improve error handling and empty-state messaging for unsupported tickers.
- Add richer company fundamentals and analyst summaries.
- Expand the dashboard with more connected market intelligence widgets.
- Hardening the backend for provider-specific failures and caching edge cases.
- Add more polished UI states without changing the existing design language.

## 10. Recommended next sprint
- Finish the first full investor workflow:
  - ticker search
  - live metrics
  - recommendation reasoning
  - price chart
  - news
  - favorites
- Add a portfolio-style watchlist experience tied to live quotes.
- Add stronger backend resilience and provider fallback behavior.
