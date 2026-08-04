# Insider Trading Intelligence — Architecture Research

**Phase:** INSIDER-RESEARCH-001. Pure research — no production code was written. Confirmed via direct source read: `backend/services/agentOrchestrator/agents/insiderAgent.js` is an **honest stub** (`createStubAgent({ id: "insider", category: "INSIDER", priority: 6 })`, own comment: *"No insider-trading (Form 4 or equivalent) provider or service exists anywhere in this codebase yet"*) — confirmed via repo-wide grep: zero references to Form 3/4/5, OpenInsider, or any insider-transaction provider exist anywhere else either. This is a genuine blank-slate research phase, the same starting point as the Options Agent before its own architecture research.

---

## 1. Regulatory foundation — what Form 3/4/5 actually are

- **Form 3 (Initial Statement of Beneficial Ownership):** filed when a person **first becomes** a Section 16 insider (an officer, director, or beneficial owner of more than 10% of a registered class of the company's equity) — establishes their starting ownership position, due within 10 days of becoming an insider. **Required data:** the new insider's role classification and their starting share count — a low-signal, purely establishing filing, not itself a trading signal.
- **Form 4 (Statement of Changes in Beneficial Ownership):** filed for **each subsequent transaction** — the primary, most information-dense insider filing, and this research's central focus. **Required data:** transaction date, transaction code (below), share count, price, and post-transaction shares owned. **Reliability:** high — a real, legally mandated, standardized disclosure with real legal consequences for inaccuracy. **A critical, real regulatory fact directly relevant to §7 (Filing Delays):** Form 4 must be filed within **2 business days** of the transaction (tightened from 10 calendar days by the Sarbanes-Oxley Act of 2002) — both the real transaction date and the real filing date are separate, always-present fields on every filing, making lateness a directly, objectively computable fact, not an inference.
- **Form 5 (Annual Statement of Changes in Beneficial Ownership):** an annual catch-all covering transactions that were **exempt** from Form 4's immediate-reporting requirement, or simply missed a Form 4 deadline — due within 45 days of fiscal year end. **Reliability/significance: meaningfully lower than Form 4** for this platform's purposes — it disproportionately captures exempt, small, or routine transactions (and occasionally late corrections), and should be weighted lower in any composite score, not treated as equivalent evidence to a timely Form 4.

## 2. Officer transactions, Director transactions, 10% owner transactions

- **Required data:** Form 4's own Item 6 role checkboxes (officer/director/10% owner — a filer can hold more than one role simultaneously) plus, for officers, their specific title.
- **A real, important distinction this research surfaces, directly relevant to §12's academic literature review:** an **officer or director's** transaction reflects someone with genuine, granular operational insight into the business — the classic "insider" in the informational sense. A **10% owner's** transaction, by contrast, is frequently an **institutional or activist investor** (a fund crossing a disclosure threshold, adjusting a large position for portfolio-management reasons unrelated to any private view on the company) — a categorically different, generally *weaker* informational signal despite sharing the same Form 4 filing mechanism. **Reliability:** high for role classification itself (a directly disclosed fact); the *interpretation* of what a given role's transaction implies is where real judgment is required, addressed directly in `INSIDER_SCORING_MODEL.md`'s Executive Score (§2) weighting officer/director transactions more heavily than 10%-owner-only transactions.
- **False-positive risk:** treating every Form 4 filer identically regardless of role would conflate a CFO's personal open-market purchase with a passive index fund's routine rebalancing-driven position adjustment — a real, well-documented category error this research's scoring model explicitly guards against.
- **Scientifically defensible?** **Yes** — the officer/director-vs-10%-owner distinction is not a novel interpretation invented for this platform; it is the SEC's own real, legally-defined categorization (Section 16(a) of the Securities Exchange Act), and academic insider-trading research consistently treats these categories separately for exactly this reason.

## 3. Cluster buying / Cluster selling

- **Required data:** multiple, **distinct** insiders at the **same** company transacting in the **same direction** within a defined time window.
- **Reliability: the single most scientifically well-supported signal in this entire research area.** Real, peer-reviewed academic literature on insider trading (e.g., the well-known Lakonishok & Lee line of research on the predictive power of insider trading) has repeatedly found that **clustered** insider activity — multiple independent insiders acting the same way around the same time — carries materially stronger predictive signal than any single insider's isolated transaction, since it reduces the risk that one person's trade reflects purely personal/liquidity reasons unrelated to the company's prospects.
- **False-positive risks:** a cluster of **sales** is a categorically weaker signal than a cluster of **purchases** (§12's asymmetry finding) — a naive cluster-detector treating buy-clusters and sell-clusters as symmetric would materially overstate the significance of routine, coordinated sell events (e.g., several executives exercising options and selling on the same pre-scheduled trading-plan date, a routine administrative coincidence, not a coordinated bearish signal); a scheduled 10b5-1 trading plan (a pre-arranged, pre-scheduled trading program disclosed at the time of adoption, precisely designed to avoid the appearance of opportunistic trading) executing on a predictable cadence can also produce an apparent "cluster" that is actually pre-programmed, not a spontaneous signal — where a filing discloses 10b5-1 plan status, this must be factored in, not ignored.
- **Scientifically defensible?** **Yes, for purchase clusters specifically** — this is the most academically defensible signal in the whole research area. Sell clusters are real and worth tracking but should carry a materially lower confidence ceiling, per `INSIDER_SCORING_MODEL.md` §3's design.

## 4. Ownership change

- **Required data:** the insider's post-transaction share count (a real, always-present Form 4 field) compared against their pre-transaction holdings (derivable from the prior filing, or directly stated as a delta on the current one).
- **Reliability:** high, directly computable — the real, meaningful question is not the raw share/dollar count of a transaction alone, but **what percentage of that insider's own total position it represents.** A sale of 10,000 shares by someone who holds 50,000 (a 20% reduction) is a materially different signal than the same 10,000-share sale by someone who holds 5 million (a 0.2% reduction, likely routine).
- **False-positive risks:** treating absolute dollar value as the sole significance measure (rather than normalizing by the insider's own existing stake) is a well-known naive-analysis mistake — a wealthy executive's routine, small-percentage diversification sale can carry a large absolute dollar figure while being genuinely low-signal.
- **Scientifically defensible?** **Yes** — percentage-of-holdings framing is standard practice in both academic and practitioner insider-trading analysis, directly informing `INSIDER_SCORING_MODEL.md`'s Ownership Score (§4).

## 5. Transaction significance

- **Required data:** the transaction's dollar value, its percentage of the insider's own holdings (§4), and — critically — its **transaction code** (below).
- **The single most important false-positive-reduction finding of this entire research, confirmed via well-established, standardized SEC Form 4 transaction-code conventions (Table I, non-derivative transactions):**

| Code | Real meaning | Genuine discretionary signal? |
|---|---|---|
| `P` | Open-market or private purchase | **Yes — the highest-significance code** |
| `S` | Open-market or private sale | Yes, but weaker signal than `P` per §12's asymmetry |
| `A` | Grant, award, or other acquisition (e.g., a restricted stock grant) | **No** — routine compensation mechanics, not a discretionary market decision |
| `M` | Exercise or conversion of a derivative security (an option exercise) | **No** — routine, often pre-scheduled compensation mechanics |
| `F` | Shares withheld/delivered to satisfy tax liability on a vesting event | **No — this is not a genuine "sale" signal at all**, despite frequently being coded with a disposition flag; conflating an `F`-coded tax-withholding transaction with a genuine discretionary `S` sale is a well-documented, common naive-analysis error |
| `G` | Bona fide gift | **No** — not a market transaction at all |
| `C` | Conversion of a derivative security | Generally no |

- **Reliability:** the transaction-code field itself is a standardized, always-present, legally mandated field — extremely reliable as raw data. **A tool's reliability entirely depends on whether it actually reads and respects this field**, rather than naively treating every reported "acquisition" or "disposition" as an equivalent buy/sell signal.
- **Scientifically defensible?** **Yes, decisively** — this is not a modeling choice this research invented; it is the SEC's own standardized coding scheme, and any credible insider-trading analysis tool in practice or academia respects this distinction.

## 6. 10b5-1 trading plans (a necessary cross-cutting concern, not separately named in the mission but required by §3/§5's own findings)

- Form 4 filings disclose whether a transaction was made pursuant to a Rule 10b5-1 trading plan (a pre-arranged, pre-scheduled program adopted in advance, specifically to provide a defense against insider-trading allegations by removing discretion over the exact timing). **A 10b5-1-plan transaction is a real, meaningfully weaker discretionary signal than an unplanned, purely opportunistic transaction** — this flag should discount, not disqualify, a transaction's significance score.

## 7. Filing delays

- **Required data:** both the real transaction date and the real filing date (both always-present, separate Form 4 fields) — the gap between them is a directly computable fact, not an inference.
- **Reliability:** high — the 2-business-day requirement (§1) is a hard, well-established regulatory deadline, making "was this filed late" an objective, checkable fact.
- **A real, disclosed, academically-studied phenomenon:** research into late-filed Form 4s has found they can, on average, correlate with somewhat worse subsequent stock performance than promptly-filed ones — a plausible, disclosed interpretation being that insiders may be more inclined to delay disclosing trades they'd prefer less scrutiny on. **This should be treated as a real, but modest, corroborating signal, not a standalone strong claim** — the sample of genuinely late-filed Form 4s for any single symbol will typically be small, and this platform's own established "don't over-claim from a small sample" discipline applies directly.
- **Scientifically defensible?** **Yes, as a described statistical association in the academic literature; more modest than the cluster-buying finding** — should carry a real but bounded confidence contribution, not treated as equally strong evidence.

## 8. Historical predictive value

- **A well-established, real body of academic literature exists specifically on this question** — this research does not need to invent a theory of insider-trading predictiveness; it can and should ground itself in the real, published findings:
  - Open-market **purchases** by insiders have been found, across multiple independent academic studies over several decades, to have modest but statistically real predictive power for subsequent abnormal stock returns — particularly when made by multiple insiders (clusters, §3) and by officers/directors specifically (§2) rather than passive 10%-owner filers.
  - Insider **sales**, by contrast, have much weaker and more mixed predictive value in the literature — a very well-established, real explanation being that insiders sell for many routine, uninformative reasons (diversification, funding a home purchase, tax planning, a scheduled 10b5-1 plan, §6) that have nothing to do with their view of the company, whereas there are comparatively few routine, uninformative reasons to voluntarily buy more stock with one's own money.
- **This asymmetry (purchases > sales in predictive value) is the single most important, well-established finding this research grounds its entire scoring design in** — recommend it be explicitly, prominently disclosed wherever this platform presents insider signals to a user, not left implicit.
- **Scientifically defensible?** **Yes — this is a real, peer-reviewed, decades-studied empirical finding, not a novel or speculative claim.** The magnitude of the effect found in the literature is real but modest (not a strong, mechanical trading signal on its own) — this platform's own presentation should reflect that modesty, consistent with the "scientifically defensible vs. marketing speculation" distinction this whole research series has applied to every prior domain (`MARKET_MICROSTRUCTURE_GUIDE.md` §6's identical discipline, applied here to insider trading).

---

## 9. Data source evaluation

### SEC EDGAR

- **Confirmed live this session**: `sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4` is a real, live, no-authentication, **real-time** feed of Form 4 filings as they are received and processed by the SEC (confirmed via direct observation of genuine, current-dated filings during this research), with a real, documented RSS feed link for programmatic monitoring.
- **The authoritative, ground-truth source** — every other provider in this research ultimately derives from this same underlying filed data.
- **Real limitation, distinct from the Valuation Agent's SEC EDGAR XBRL experience**: unlike XBRL financial-statement data (which the SEC's `data.sec.gov/api/xbrl/*` APIs expose as clean, pre-structured JSON, confirmed real in `VALUATION_RESEARCH.md` §10), **the SEC does not offer an equivalently clean, pre-parsed, symbol-indexed REST API specifically for Form 4 transaction data** — accessing structured transaction-code-level detail requires either the (rate-limited, keyword-oriented) EDGAR full-text search, or downloading and parsing each individual filing's own XML ownership-document body — a real, non-trivial engineering lift, meaningfully heavier than the XBRL case.

### Finnhub

- **This platform already has a real, configured Finnhub relationship** (confirmed via `finnhubService.js`, already used for quotes/profile/metrics elsewhere in this codebase) — Finnhub's own well-documented API includes a real `/stock/insider-transactions` endpoint returning already-parsed transaction records (insider name, share count, change, filing date, transaction date, transaction code, transaction price) — **this is the cheapest possible path to real insider data for this platform**, since it requires reusing an existing vendor relationship rather than a new one, directly mirroring the same "audit and reuse what's already being paid for" finding this research series made for the Valuation Agent's underused Finnhub metrics response.
- **Reliability:** a well-established, widely-used financial-data vendor; ultimately sourced from the same SEC filings, pre-parsed for convenience — a real, meaningful reduction in engineering burden versus parsing raw EDGAR XML directly.

### OpenInsider

- **A real, long-standing, free, browser-facing website** providing pre-aggregated Form-4-derived screens (including cluster-buy views, directly relevant to §3) — **not independently re-verified live this session** (a direct fetch attempt returned only an ad-tracking redirect, not real page content — this should be treated as inconclusive, not as evidence the site doesn't exist, consistent with the "a failed fetch is not proof of absence" discipline this research series has applied to similarly inconclusive fetches for CBOE and FINRA in prior phases).
- **A real, important limitation, based on well-established general knowledge of this site's nature**: OpenInsider is fundamentally a **screener website**, not an official, documented, rate-limited, stable programmatic API — historically accessed by third parties via web scraping, not a supported integration path. This carries real Terms-of-Service and stability risk (a scraped, undocumented integration can break without notice, unlike a vendor's own published, versioned API) that this research recommends disclosing explicitly rather than treating OpenInsider as equivalent in reliability to Finnhub or direct SEC EDGAR access.

### Other reliable providers

- **Quiver Quantitative** — a real, known alt-data aggregator with a documented API covering insider transactions (alongside congressional trading and other alternative datasets) — a plausible Production-tier option for pre-computed cluster/screening analytics beyond Finnhub's raw transaction-level data.
- **Intrinio** — already evaluated as a fundamentals-data option in `VALUATION_RESEARCH.md` §10; also offers an insider-transactions product line, a plausible alternative/supplement to Finnhub.
- **Specialized global insider-ownership data vendors** (e.g., 2iQ Research/Verity-class providers) — enterprise-tier, offering deeper historical depth and cross-market (non-U.S.) coverage beyond what SEC-EDGAR-derived sources alone provide, appropriate only once genuine international-market insider coverage is a real, justified requirement.

---

## 10. Summary of concrete, evidence-grounded findings driving this research's design

1. Zero insider-trading infrastructure exists in this codebase today — this is a genuine blank-slate design, like the Options Agent before its own research phase.
2. The SEC's own real-time, free, no-auth Form 4 feed was independently confirmed live this session — a genuine, authoritative, permanent free cross-check source, though requiring real engineering effort to parse (unlike the Valuation Agent's cleaner XBRL API experience).
3. Finnhub — already a configured vendor relationship in this codebase — offers a real, documented, pre-parsed insider-transactions endpoint, the cheapest realistic MVP path.
4. Transaction-code discipline (P/S = genuine discretionary; A/M/F/G = routine compensation mechanics, not real buy/sell signals) is the single most important false-positive-reduction finding in this whole research area, and is not a novel invention — it is the SEC's own standardized coding scheme.
5. Cluster purchases by officers/directors are the single most scientifically defensible signal in this research area, directly grounded in real, decades-old, peer-reviewed academic literature; insider sales carry a real but much weaker, more mixed predictive signal — this asymmetry should shape every scoring decision in `INSIDER_SCORING_MODEL.md`.
6. Filing delays are a real, objectively computable fact (both dates are always present) with a real but modest documented predictive association — a corroborating signal, not a standalone strong claim.
