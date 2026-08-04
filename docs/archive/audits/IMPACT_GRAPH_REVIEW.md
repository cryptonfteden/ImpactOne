# IMPACT_GRAPH_REVIEW.md

**Phase X3 — Institutional UX Red Team**
**Persona:** hedge fund analyst, judging only the live product.

---

## What Exists

`buildImpactGraph()` (`backend/services/relationshipGraphService.js`) is a real, existing backend function, consumed internally by `impactIntelligenceService.js`'s `analyzeIntelligence` — it computes relationship/propagation data between an event and related market nodes. This has existed since well before this review phase.

**No dedicated "Impact Graph" screen, component, or visualization exists anywhere in the shipped frontend.** A repo-wide search for a component named anything like `ImpactGraph` returned nothing, and no nav item, tab, or card in the live product surfaces this data as a graph, network diagram, or any visual relationship map. The closest live-observable trace of this data is text-only: sentences like *"'AI infrastructure demand remains strong' is being weighed against AI Infrastructure and Semiconductors exposure... propagating from AI demand to Semiconductors (up)"* on Daily Feed and Recommendation cards — a real causal chain, but expressed as a sentence, never as a diagram a hedge fund analyst could visually trace.

---

## Judged Against the Question "Can Users Understand Market Causality?"

Partially, and only through reading, never through seeing. The underlying reasoning genuinely does model a causal chain (event → sector exposure → historical analog → propagation direction), which is more sophisticated than most retail tools attempt. But an analyst's mental model of causality is normally visual and relational — nodes and edges, or at minimum a directional flow diagram — and this product currently offers none of that. Every causal claim must be parsed from a paragraph, repeated with only the event name changed across similar items (a separate, previously-documented finding), which makes it harder, not easier, to build genuine intuition about *how* the platform believes causality flows.

## Judged Against "Anything That Weakens ImpactOne's Unique Identity"

This is actually a missed opportunity for identity, not a threat to it. A real, visual Impact Graph — built on data that already exists — would be one of the most defensible, hard-to-copy differentiators available to this product, precisely because the underlying causal-chain computation is already real (not fabricated), unlike most competitors' "AI insights" which are typically just sentiment scores. Not building a visual representation of data the platform already computes is leaving a genuine identity asset unused, not a complexity risk.

---

## Verdict for This Specific Concept

Not gradable as a UI feature because none exists. As a gap: the backend groundwork is real and more sophisticated than the current UI gives it credit for. Recommend this become a genuine near-term priority — visualizing already-computed causal data is lower-risk and higher-identity-value than most other proposed additions reviewed this session, since it requires no new data source or AI logic, only a rendering layer over data that's already trustworthy.
