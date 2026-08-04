# Platform Duplication Audit

**Phase:** PLATFORM-AUDIT-001
**Scope:** The implementation completed so far — Mission Control (`MissionControlHomeScreen.jsx`), Portfolio Workspace (`PortfolioWorkspaceScreen.jsx`), News Intelligence (`NewsIntelligenceScreen.jsx`), and the Design System (`frontend/src/components/nova/`), plus their real, direct dependencies (`Badge.jsx`, `MetricArc.jsx`, `HeroCard.jsx`, `DemoModeBanner.jsx`, `IntelligenceCard.jsx`, `AttentionLevelBadge.jsx`, `FeedItemCard.jsx`, `components.css`). Every finding below was verified by reading the actual current source, not inferred from commit messages or prior documents.

**Context worth stating up front:** since the last audit of this codebase, a real, deliberate design-system extraction (`DESIGN-SYSTEM-001`) landed, specifically responding to duplication findings from that prior audit — `HeroCard`, `DemoModeBanner`, `IntelligenceCard`, and `AttentionLevelBadge` were extracted from Mission Control and Portfolio Workspace's near-identical inline implementations, and the newest screen (News Intelligence) correctly builds on top of that shared layer rather than reinventing its own visual components. This is genuine, verified progress. What follows is what's left — mostly business-logic duplication introduced by the newest screen, not the component-level duplication the prior extraction already closed.

---

## No duplicated components — certified, with one caveat

**Certified for visual components.** `HeroCard`, `DemoModeBanner`, `IntelligenceCard`, `MetricArc`, `AttentionLevelBadge`, and `Badge` are each defined exactly once in `frontend/src/components/nova/`, and all three screens import and use the same instances — confirmed directly in each screen's import statement and JSX. No screen has its own local reimplementation of any of these.

**Caveat, not a duplication:** Portfolio Workspace's "Which Positions Need Attention" list does not use the shared `AttentionLevelBadge` component at all — it renders only a raw `MetricArc` with no categorical label, while Mission Control and News Intelligence both correctly use `AttentionLevelBadge` for their conceptually identical attention displays. This is not a duplicate component (there is no second, competing implementation) — it is an incomplete adoption of the shared one, which belongs in the terminology section below since its user-facing effect is the same as a naming inconsistency.

## Duplicated business logic — found, three instances

### D1. `statusTone()` / `statusPlainLabel()` — byte-identical, copy-pasted between two files
`MissionControlHomeScreen.jsx` and `NewsIntelligenceScreen.jsx` each define their own, word-for-word identical copy of both functions:

```js
function statusTone(status) {
  if (status === "STRENGTHENING") return "positive";
  if (status === "WEAKENING") return "warning";
  if (status === "INVALIDATED") return "neutral";
  return "info";
}
function statusPlainLabel(status) {
  if (status === "STRENGTHENING") return "Getting more likely";
  if (status === "WEAKENING") return "Getting less likely";
  if (status === "INVALIDATED") return "No longer holds up";
  return status;
}
```
Neither file imports this from the other or from a shared module — it exists as two independent, currently-in-sync copies. Any future change to one (a new lifecycle status, a wording tweak) has no mechanism forcing the other to follow.

### D2. Attention-level thresholding — identical logic, different function names, different files
`MissionControlHomeScreen.jsx`'s `recommendedAttentionLevel(score)` and `NewsIntelligenceScreen.jsx`'s `attentionLevelForScore(score)` are functionally identical (same `>= 75` / `>= 45` thresholds, same three return values), just named differently:

```js
// MissionControlHomeScreen.jsx
function recommendedAttentionLevel(score) {
  if (!Number.isFinite(score)) return "Low";
  if (score >= 75) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}
// NewsIntelligenceScreen.jsx
function attentionLevelForScore(score) {
  if (!Number.isFinite(score)) return "Low";
  if (score >= 75) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}
```
This is arguably the more consequential of the two, since it defines the actual thresholds behind a real, user-facing classification (High/Medium/Low attention) that both a released screen and a brand-new screen depend on independently. If this threshold is ever tuned in one file, the two screens will silently disagree about what counts as "High attention" for what is meant to be one platform-wide concept.

### D3. "What changed since yesterday" claim-correlation logic — semantically duplicated, independently reimplemented, with different sophistication
`FeedItemCard.jsx` (the existing Daily Feed) already has a real, carefully-reasoned `computeChangedClaimsText()` — it checks a real time window (`RECENT_TRANSITION_WINDOW_MS`), distinguishes DRAFT/STRENGTHENING/WEAKENING/INVALIDATED transitions with honest causal-vs-correlative language, and explicitly avoids claiming causation it can't support. `NewsIntelligenceScreen.jsx`'s own `describeOvernightChange()` answers the identical underlying question ("how does this news item relate to a Claim's status change") but is a simpler, independently-written function that does not check any time window and does not distinguish transition types with the same care. News Intelligence's own code comment even names `FeedItemCard.jsx`'s function as the discipline precedent it's following — but it reimplemented the idea rather than importing or sharing the real logic, meaning the platform now has two different, differently-reasoned answers to the same question, one materially more rigorous than the other.

## No duplicated API calls — certified

Every API call across all three screens goes through the same shared client modules in `frontend/src/services/api/` (`claimsApi`, `portfolioEngineApi`, `morningBriefApi`, `marketSentimentApi`, `intelligenceApi`). Where two screens call the same method (e.g., both Mission Control and News Intelligence call `claimsApi.listOvernightChanges()`), it is the same shared function being reused for a genuinely shared purpose, not two independent implementations of "fetch overnight claim changes." No screen defines its own parallel fetch logic or duplicate endpoint client.

## No duplicated state — certified

Each screen's local `useState`/`useEffect` data-loading state is scoped to that screen's own real needs, with no evidence of a redundant global store duplicating data already held elsewhere. The `liveSections` pattern (per-section Demo Mode tracking) is structurally repeated across all three screens, but this is intentional, parallel use of the same *pattern* over each screen's own distinct data — not duplicated state in the sense of two places holding the same value that could drift out of sync.

## No duplicated styling — certified

`.mc-tier-1/2/3`, `.mc-hero`/`.mc-hero--enter`, and the `.nova-badge[data-tone=...]` rules (including the new, dedicated `attention` tone) are defined exactly once in `components.css` and referenced by class name from all three screens via the shared `HeroCard`/`AttentionLevelBadge` components — no screen defines its own competing CSS rule for the same visual treatment.

## Duplicated terminology — found, one instance (the flip side of D2/component adoption)

Because Portfolio Workspace's position-attention list doesn't use `AttentionLevelBadge` (see the Components caveat above), a user moving between screens still encounters attention represented two different ways for the same real Attention Engine score: a categorical "Attention: High/Medium/Low" badge (Mission Control, News Intelligence) versus a raw, unlabeled number (Portfolio Workspace). This isn't a second, competing term being used — it's the platform-standard term simply not yet being applied everywhere it should be, which produces the same user-facing inconsistency a genuine terminology duplication would.

---

## Summary

| Area | Result |
|---|---|
| Duplicated components | **None found.** Certified. (One incomplete-adoption caveat, not a duplicate.) |
| Duplicated business logic | **3 found** — D1 (byte-identical status tone/label), D2 (identical attention thresholds under two names), D3 (semantically duplicated, independently reimplemented claim-change narration). |
| Duplicated API calls | **None found.** Certified. |
| Duplicated state | **None found.** Certified. |
| Duplicated styling | **None found.** Certified. |
| Duplicated terminology | **1 found** — inconsistent attention-badge adoption in Portfolio Workspace, a consequence of the same underlying gap as the business-logic findings above (nothing shared, so nothing enforces consistency). |

All three business-logic duplications (D1–D3) share one root cause: each was written independently by whichever screen needed it, at the time it needed it, with no shared module to reach for. The design-system extraction that already happened (`DESIGN-SYSTEM-001`) solved this exact problem for *visual* components; the same extraction discipline has not yet been applied to the smaller, easy-to-miss *logic* functions living alongside them.
