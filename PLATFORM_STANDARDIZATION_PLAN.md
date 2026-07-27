# Platform Standardization Plan

**Phase:** PRODUCT-CONSISTENCY-001
**Status:** Plan only. No code was changed to produce this document. Sequences and prioritizes the findings in [PRODUCT_STYLE_GAPS.md](PRODUCT_STYLE_GAPS.md) by the same engineering/product-impact logic established in this engagement's other planning documents — impact first, effort tracked separately.

---

## Priority 1 — Fix the Attention/Confidence/Status badge tone collision (H1)

**Why first:** this is the one finding that directly contradicts a named, explicit rule in the Design Bible (§5) that a sibling component (`MetricArc`) was already built specifically to satisfy — it's the most concrete, most easily-explained, and most quickly fixable finding in this audit, and it sits directly next to a component that already gets it right, making the fix a small, well-scoped change rather than a redesign.

**What it requires:** a dedicated, exclusive tone (or direct color reference) for Attention-level badges, separate from the shared `positive`/`warning`/`info`/`neutral` tone vocabulary `Badge` currently uses for confidence bands, direction, and status. The most consistent option is extending `Badge`'s tone system with an `attention` tone that always resolves to the same fixed brand hue `MetricArc` already uses for its Attention arcs — so the arc and the badge sitting beside it are visually and semantically the same signal, not just adjacent numbers.

**Where to apply it:** every current use of `attentionLevelTone()` in `MissionControlHomeScreen.jsx`, and the equivalent presentation in `PortfolioWorkspaceScreen.jsx` if/when it adds a categorical attention badge (see Priority 2).

## Priority 2 — Establish one shared vocabulary for "attention" across the platform (H2)

**Why second:** this is a naming decision, not a technical one, so it should be settled once, in one place, before Priority 1's badge work and Priority 3's shared-component work both need to reference it — fixing the badge color without also fixing the word next to it would leave the platform with a differently-colored but still differently-worded signal.

**What it requires:** a single, documented term (or a small, fixed set of level labels) for "how much this deserves the user's notice right now," used identically wherever the Attention Engine's score is surfaced categorically. This should be decided as a product/copy decision first, then applied consistently to Home, Mission Control, and Portfolio Workspace. It does not require all three screens to use identical UI treatment (a compact screen like Home may reasonably want a shorter phrase than Mission Control's badge), but the underlying *word* for "high attention" should be traceable to one canonical term across all three, not three unrelated phrases.

## Priority 3 — Extract the shared tone-mapping and section-tracking logic into one place (M1, M2)

**Why third:** both of these are the same underlying problem — logic that is currently duplicated (by copy, or by independent reinvention) between Mission Control and Portfolio Workspace despite the two screens explicitly being built on "the same architecture." Fixing this after Priorities 1–2 means the shared logic can be extracted once, already reflecting the corrected badge tone and vocabulary decisions, rather than needing a second pass.

**What it requires:**
- Move `directionTone()`/`statusTone()` (and the equivalent attention-tone logic from Priority 1) into a single shared module both screens import, rather than each screen defining or inlining its own copy.
- Standardize the Demo Mode section-tracking key vocabulary and granularity — at minimum, ensure every section-level label shown to a user in a partial-outage banner clearly covers every UI section that actually depends on that fetch (Portfolio Workspace's "claims" label should make clear it also covers the positions-attention list, either by renaming the label or by explicitly listing both dependent sections).

## Priority 4 — Close the internationalization gap on Mission Control (H3)

**Why fourth:** larger in scope than the previous three items, and not something that can be done partially — it needs to be sized as its own piece of work, and to be worth doing well, should build on whatever `t()` key naming conventions Portfolio Workspace already established when it did this correctly, rather than inventing a second convention. This also covers the Demo Mode banner's copy in *both* screens, since that gap exists identically in both — this is the one fix that improves both screens at once.

**What it requires:** an audit of every hardcoded string in `MissionControlHomeScreen.jsx`, translation keys added following Portfolio Workspace's existing `portfolioWorkspace.*` naming pattern (e.g. a parallel `missionControl.*` namespace), and — specifically — moving the Demo Mode banner copy (currently hardcoded identically in both files) into a single shared, translated string used by both screens, which also directly resolves the "these two screens should share this literal copy" intent already expressed in both files' code comments.

## Priority 5 — Document the conventions this audit found working well, so future screens don't have to rediscover them (M3, M4, L1–L3)

**Why last:** these are lower-severity, mostly-cosmetic items, but they share a common root cause worth solving once: several of this audit's *positive* findings (the `◇` empty-state icon, the three-part empty-state copy structure, the button-vs-plain-row interactivity choice) are currently true only because two screens happened to copy each other, not because either is written down as a rule. Writing them down now, while there are only two screens to reconcile, is far cheaper than doing it after a third or fourth screen has each made its own independent choice.

**What it requires:**
- A short addendum to `IMPACTONE_DESIGN_BIBLE.md`'s §10 (Empty States) naming the `◇` icon as the standard, alongside the already-excellent copy guidance.
- A one-line convention note (in the Bible or a component-level doc) on when a list row should be an interactive `<button>` versus a plain, static row.
- Small, easy fixes bundled in while this pass is happening: the "0 item" pluralization bug (L1), and the Design Bible's own internal `§9`-vs-`## 10` numbering mismatch (L2).
- The M3/M4 findings (list-row convention, one untranslated card title inside an otherwise-translated file) are naturally swept up by Priorities 3 and 4 above and don't need separate scheduling.

---

## Sequencing summary

| Order | Item | Why here |
|---|---|---|
| 1 | Attention/Confidence/Status badge tone collision (H1) | Smallest, most concrete fix; directly restores an already-stated Bible rule right next to where it was already correctly implemented once. |
| 2 | Shared "attention" vocabulary (H2) | A naming decision that Priority 1 and 3's work should already reflect once made — settle the word before touching more code that uses it. |
| 3 | Shared tone-mapping module + Demo Mode section-key consistency (M1, M2) | Consolidates now-duplicated logic once, already reflecting Priorities 1–2's decisions, avoiding a second pass. |
| 4 | Mission Control i18n + shared Demo Mode copy translation (H3) | Larger, standalone piece of work; benefits from reusing Portfolio Workspace's already-established `t()` key conventions. |
| 5 | Document the conventions already working (empty-state icon, copy structure, row-interactivity rule) + small cosmetic fixes (M3, M4, L1–L3) | Cheapest to fix now, while only two screens exist to reconcile; prevents this audit's positive findings from silently drifting once a third screen is built. |

## What "standardized" looks like when this plan is complete

A user moving between Home, Mission Control, and Portfolio Workspace encounters the same word for "this needs your attention" everywhere it appears, in the same color, never sharing that color with an unrelated concept. Every screen built on "Mission Control's architecture" actually shares its tone-mapping and section-tracking code, not just a resemblance arrived at by copying. Every screen's user-facing copy — including the Demo Mode disclosure — is translated through the same mechanism, not present in some screens and absent in others. And the conventions this audit found already working (empty-state icon, copy structure) are written down somewhere a future screen's author would actually find them, rather than existing only as an accident of two screens having copied each other so far.
