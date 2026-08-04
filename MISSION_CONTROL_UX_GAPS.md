# Mission Control UX Gaps — Phase DESIGN-002-REVIEW

Every issue identified in `MISSION_CONTROL_DESIGN_REVIEW.md`, extracted and ranked. This is a gap list only — no redesign, no implementation guidance.

---

## CRITICAL

### 1. The document does not defend why it isn't a dashboard
Ten independently-specified, vertically-stacked sections — each with its own elevation, motion, density, and interaction rules — is, structurally, a dashboard, however deliberately weighted. The specification never directly confronts this, only asserts that its prioritization is more deliberate than a typical dashboard's. This is the single biggest risk to the "premium intelligence operating system" ambition (mission Q1 and Q6).

### 2. Section order contradicts the claimed eye-path
Today's Brief (§3.1) sits above Top Priority (§3.2) in the document's own vertical flow, yet the "first 10 seconds" narrative asserts the eye lands on Top Priority first. These two claims are not reconciled anywhere in the document. This is a direct contradiction of the document's own central claim that there is "exactly one visual starting point" (mission Q2).

### 3. Platform-specific jargon is used without any teaching mechanism
"Attention Score," "Claim," "Contested Claim," "Confidence," "Recommended Attention Level," "invalidated," "strengthened/weakened" all appear throughout the spec with no proposed tooltip, first-use explainer, or glossary. An "ordinary investor" (the mission's explicit persona) is not assumed to already know this vocabulary anywhere else in the platform's currently-reviewed history. This directly fails the mission's Q3 test ("does it require financial knowledge").

### 4. Differentiation is entirely in copy and reasoning, not in anything a screenshot would show
Structurally — a card-based headline list, a paired risk/opportunity callout, a portfolio panel, a sentiment gauge, a news feed, an events calendar — the layout is close to Yahoo Finance's or Seeking Alpha's existing personalized dashboards. No distinctive visual primitive is proposed anywhere in the document that would survive the mission's explicit screenshot-without-logos test (Q9).

### 5. Premium feeling is asserted, not architecturally earned
The document's own rigor — a full, independent specification for each of ten sections — is evidence of a well-organized *collection*, not necessarily of a *unified* system. The reference brands the mission itself names (Apple, Linear) achieve premium feeling through radical reduction of distinct visual treatments, which this specification does not attempt (mission Q6).

---

## HIGH

### 6. Biggest Risk and Best Opportunity are deliberately equal — in direct tension with "nothing is equal"
The document's own opening principle (§2) states nothing on the screen should be equal, then deliberately designs two sections to be equal in weight a few pages later, without reconciling the contradiction (mission Q2).

### 7. Three overlapping signals per Brief item (Attention Score, Confidence, Attention Level badge)
Likely redundant expressions of the same underlying judgment, shown three ways in the section explicitly meant to be the lowest-density, fastest-to-read part of the screen (mission Q3, Q7).

### 8. "Continue Exploring" likely duplicates existing global navigation
If persistent navigation to Portfolio/Watchlist/Symbol Pages/AI Analysis already exists elsewhere in the product (as it must, for a multi-screen application), a dedicated exit-navigation section at the bottom of the daily home screen is redundant chrome competing for the user's scroll and attention (mission Q7).

### 9. The Live Intelligence Feed's placement risks undoing the screen's own discipline
Placing the single highest-density section immediately beneath the most curated, lowest-density content risks re-inviting "scan everything" behavior at the exact point the design's actual job (bounding, prioritizing) was already finished (mission Q5, Q7).

### 10. Cold-start personalization collapse is unaddressed
For any user without an established portfolio, watchlist, or interaction history, the document's own honest fallback means two different new users would very likely see close to the same screen — directly matching the failure mode the mission's Q8 asks reviewers to probe for.

---

## MEDIUM

### 11. Visible belief-revision is treated as unambiguously trust-building, with no acknowledgment of the opposite risk
Watching the platform "change its mind" often (Claims strengthening/weakening/invalidating) could read as inconsistency rather than transparency, especially before a user has built up trust in a real track record (mission Q5).

### 12. The emotional arc ends by fading out rather than concluding with intent
The final three sections are described purely in terms of decreasing visual energy ("calming down," "flattest," "quietest") rather than a deliberate closing beat (mission Q5).

### 13. Biggest Risk / Best Opportunity could plausibly be merged into one paired section
Rather than two fully, independently specified sibling sections, a single "Key Signals Today" treatment could achieve the same intended balance with less total structural surface area (mission Q7).

### 14. Market Pulse, Upcoming Events, and Continue Exploring together occupy three of ten sections for the least time-sensitive content
A stricter application of the document's own "postpone what isn't essential" logic isn't applied to its own lowest-urgency sections (mission Q7).

### 15. Upcoming Events doesn't address what would make a scheduled event notable
The section pre-answers "what's coming" but not "why would this specific event matter more than a routine one" (e.g., a consensus expectation to compare against) — a minor Zero Prompt completeness gap (mission Q4).

---

## LOW

### 16. Ambiguity about whether entrance animation competes with the "first impression" clock
The document specifies a staggered, top-down reveal on load but doesn't state how this interacts with a true 5-second (rather than 10-second) comprehension bar (mission Q1).

### 17. No explicit statement of section-header/chrome treatment
The document doesn't clarify whether each of the ten sections carries a persistent title/eyebrow label the user must parse before reaching content, which would add visual "furniture" competing with the actual findings in the first seconds (mission Q1, Q3).
