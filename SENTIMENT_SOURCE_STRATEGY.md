# Sentiment Source Strategy — Data Sources for MVP, Production, and Enterprise

**Phase:** SENTIMENT-RESEARCH-001. Pure research/design — no production code was written. **A pricing accuracy note, consistent with this whole research series' discipline**: social-platform API pricing (particularly X/Twitter's) has changed dramatically and repeatedly in recent years; one live-verification attempt this session returned only API endpoint documentation, not a clean pricing page — the figures below for X/Twitter specifically should be treated as **approximate, general-knowledge estimates requiring direct reconfirmation before procurement**, exactly as this engagement has flagged for every other similarly volatile vendor-pricing figure. Reddit's official API documentation (`reddit.com/dev/api`) was independently confirmed live this session to be a real, extensive, OAuth2-based API — its current commercial pricing terms were not independently re-verified and should be confirmed directly (Reddit's own developer terms/pricing page) before procurement.

---

## 1. MVP — cheapest path to a real, honest per-symbol sentiment capability

### 1.1 Reuse what already exists, first

Per `SENTIMENT_RESEARCH.md` §1, this platform already has: a real news feed (`autonomousMarketService`'s feed, already ingested for the market-wide engine), a real two-tier source-credibility mechanism, and a real dominance-cap governance pattern. **The cheapest possible MVP step is applying real NLP sentiment scoring to the article text this platform already ingests, filtered to the specific symbol** (via the same region/keyword-tagging approach `MARKET_REGISTRY`'s `regionTags` already uses for market-level filtering, extended to symbol-level tagging) — not acquiring a new data source at all for the news component.

### 1.2 The one real gap requiring a new capability: NLP sentiment scoring itself

Options, in increasing cost/rigor:
- **Lexicon-based scoring** (e.g., a financial-domain-tuned word list such as the well-known Loughran-McDonald financial sentiment dictionary, a real, widely-cited academic resource specifically built for financial-text sentiment, unlike generic sentiment lexicons which perform poorly on financial text's specific vocabulary) — free, simple, but the weakest of the three options, real known limitations around negation/sarcasm (per `SENTIMENT_RESEARCH.md` §2).
- **A pre-trained financial-domain NLP model** (e.g., the FinBERT family of models, openly published and usable self-hosted) — meaningfully more accurate than a lexicon approach on financial text specifically, requires real (if modest) compute infrastructure to run inference, no per-call vendor fee.
- **A vendor-provided sentiment field** (many financial-data vendors, including ones already partially evaluated in this engagement's prior research, offer a pre-computed sentiment score alongside news content) — the least in-house engineering effort, but a real, ongoing per-call/per-article cost, and the exact methodology behind a vendor's proprietary sentiment score is typically not independently inspectable, a real explainability tradeoff this platform's own "always disclose your methodology" discipline should weigh carefully.

**MVP recommendation: Loughran-McDonald-style lexicon scoring or a self-hosted FinBERT-family model** — both are free or near-free or one-time-infrastructure-cost options, both keep the actual sentiment-classification methodology fully inspectable/explainable (a real, disclosed advantage over a vendor's proprietary black-box score, consistent with this platform's `canonicalVerdict.js`-driven explainability discipline), and both are proven, well-established, non-experimental techniques.

### 1.3 Social sentiment at MVP: explicitly deferred, not attempted cheaply

Given `SENTIMENT_RESEARCH.md` §3's own finding that social sentiment carries meaningfully lower reliability and higher manipulation exposure than financial news, and given that a genuinely usable social-data feed (even a "free" tier of Reddit's or X's API) typically comes with real rate limits and, for X specifically, a real cost even at entry tiers (per this document's own pricing-accuracy caveat above) — **this research recommends the MVP explicitly ship with the news-sentiment component only**, `socialSentimentComponent` honestly reported as `unavailable` (per `SENTIMENT_SCORING_MODEL.md` §1's real `insufficientData` pattern), rather than attempting a low-quality, high-noise social integration purely to check a box. This mirrors the same "an honest zero-coverage stub is better than a fabricated/low-quality signal" discipline this whole engagement has applied to every other new agent's MVP scoping.

---

## 2. Production — adding real social sentiment and richer NLP

### 2.1 Social data sources, evaluated

| Source | Real characteristics | Cost class (approximate — reconfirm before procurement) |
|---|---|---|
| **Reddit API** | Confirmed live: a real, extensive, OAuth2-authenticated REST API covering listings/search/comments across all public subreddits (including finance-focused communities) — genuinely usable for symbol-mention monitoring via `/search`/`/r/{subreddit}` endpoints with `q`/`sort`/`t` (time-window) parameters, all confirmed real in the live documentation. Reddit's specific commercial-use pricing terms were not independently re-verified this session. | Low-to-moderate, historically tiered by request volume — reconfirm current terms directly |
| **X (Twitter) API** | A real, well-known, cashtag-searchable (`$TICKER`) platform — historically the single most-cited social-sentiment source in retail-finance commentary — but has undergone repeated, significant public pricing restructurings in recent years; **not independently re-verified live this session** (a fetch attempt returned only endpoint documentation, not current pricing) | Historically ranges from a very limited free/low tier to a materially more expensive tier for meaningful read-volume access — **must be reconfirmed directly against X's current developer pricing page before any procurement decision** |
| **StockTwits** | A finance-specific social platform (posts are inherently ticker-tagged by design, avoiding the cashtag-ambiguity problem general platforms like X/Reddit have, per `SENTIMENT_RESEARCH.md` §3's `$ALL`-for-Allstate example) — a real, purpose-built fit for this exact use case | Historically offers a developer API; current commercial terms not independently re-verified this session |
| **Specialized financial-sentiment vendors** (e.g., RavenPack, Amenity Analytics, Accern — established players specifically in the financial-news/social sentiment-as-a-service space) | Offer pre-computed, financial-domain-tuned sentiment scores across both news and social sources, avoiding the in-house NLP-model-hosting burden entirely | Enterprise-tier, custom-quoted — appropriate once in-house NLP maintenance cost/complexity outweighs a vendor relationship's cost, not a default starting point |

**Production recommendation: StockTwits as the primary social source** (purpose-built for this exact use case, avoids the cashtag-ambiguity problem, likely the best reliability-per-dollar of the 3 general-purpose options) **supplemented by Reddit** (deep, finance-focused community coverage — e.g., well-known investing-focused subreddits — genuinely complementary, not redundant, coverage) **with X evaluated only once its current pricing is directly reconfirmed**, given the real uncertainty flagged above.

### 2.2 NLP upgrade at Production tier

Recommend upgrading from a self-hosted FinBERT-family model (MVP) to either a fine-tuned version of the same model family (trained/adjusted on this platform's own accumulating, real graded-outcome history, reusing — not duplicating — the `Outcome`/`calibrationReportService.js` infrastructure this whole engagement has repeatedly recommended reusing for every other new agent's eventual calibration) or a specialized vendor's sentiment field (§2.1's 4th row) if in-house model maintenance proves too costly — this is explicitly a "revisit once real usage data exists," not a Day-1 Production requirement.

---

## 3. Enterprise — the deepest, most rigorous tier

- **A specialized financial-sentiment vendor relationship** (RavenPack-class, §2.1) becomes the default recommendation at this tier, not merely an option — at genuine enterprise scale, the ongoing engineering cost of maintaining an in-house NLP pipeline (model updates, new-source integration, bot-detection tuning) typically exceeds a dedicated vendor's cost, the same "enterprise tier is a graduation point, not a default starting point" framing this engagement has applied consistently (`OPTIONS_DATA_RESEARCH.md` §10, `ALGORITHMIC_ACTIVITY_RESEARCH.md` §4).
- **Direct, licensed access to a broader social-data firehose** (rather than each platform's own public-facing developer API, which typically carries real rate limits even at paid tiers) — appropriate only once genuine full-market, continuous coverage (not the on-demand, tracked-symbol-universe-scoped approach recommended for lower tiers) is a real, justified requirement, mirroring `ALGORITHMIC_ACTIVITY_SCORING.md` §6's identical "on-demand per-symbol, not full-market continuous, until genuinely justified" scalability principle.
- **A real, dedicated bot-detection/trust-and-safety-grade signal**, if available via a specialized vendor with access to richer account-level signal than this platform could ever independently assemble (per `SENTIMENT_RESEARCH.md` §9's own finding that third-party sentiment-consumer data is structurally limited here) — the one place a vendor relationship could genuinely improve `ManipulationRisk`'s otherwise-low ceiling (`SENTIMENT_SCORING_MODEL.md` §6), since a specialized vendor may have access to signal (cross-platform account correlation, historical ban/suspension data) no direct API access would ever expose.

---

## 4. Summary — recommended path

| Stage | News sentiment | Social sentiment | NLP approach |
|---|---|---|---|
| MVP | Reuse existing news feed, symbol-tagged | Explicitly deferred (`unavailable`, honestly disclosed) | Lexicon (Loughran-McDonald-style) or self-hosted FinBERT-family model |
| Production | Same, richer symbol-tagging | StockTwits (primary) + Reddit (supplemental); X pending pricing reconfirmation | Fine-tuned self-hosted model, or a vendor sentiment field if maintenance cost outweighs the benefit |
| Enterprise | Specialized vendor (RavenPack-class) as default | Same vendor, or direct licensed firehose access at genuine full-market scale | Vendor-provided, with a dedicated bot-detection signal where available |

**Explicitly not recommended at any tier as the sole news-sentiment source:** relying entirely on a single vendor's proprietary, non-inspectable sentiment score without also maintaining this platform's own real, disclosed methodology (lexicon or self-hosted model) as at least a cross-check — consistent with this whole engagement's "never surrender explainability to a black box" discipline, already applied identically to the Options Agent's rejection of retail "unusual activity" vendors as a primary source (`OPTIONS_DATA_RESEARCH.md` §4) and the Valuation Agent's preference for free, official SEC EDGAR data as a permanent cross-check (`VALUATION_RESEARCH.md` §10).

No code was written to implement any of the above — this document, together with `SENTIMENT_RESEARCH.md` and `SENTIMENT_SCORING_MODEL.md`, is the design/decision record for whenever a real implementation phase begins.
