# Product Consistency Report

**Phase:** PRODUCT-CONSISTENCY-001
**Method:** Direct review of the actual shipped implementation — `MissionControlHomeScreen.jsx`, `PortfolioWorkspaceScreen.jsx`, `MetricArc.jsx`, `Badge.jsx`, `components.css`, and `IMPACTONE_DESIGN_BIBLE.md` were all read in full or in the relevant part; both screens were also loaded and interacted with live in a running instance. `IMPACTONE_RELEASE_CHECKLIST.md` (this engagement's own standing quality bar) is used as the reference standard throughout, since it already defines what "consistent" is supposed to mean for this product.

**Context worth stating up front:** since the last review of these screens, real, substantial work has landed that directly answers earlier findings — Mission Control is now wired to real backend services with an honest, section-level Demo Mode indicator (Phase LIVE-DATA-001), the Confidence/Attention/Probability mislabeling in the scoring arc was fixed and the component renamed to `MetricArc` with an explicit `metric` prop (Phase MISSION-CONTROL-002), and Portfolio Workspace was deliberately rebuilt on Mission Control's exact architecture (Phase PORTFOLIO-001) specifically to bring the two screens into alignment. This is genuine, verified progress, not a claim taken on faith — the shared patterns described below were confirmed directly in both files' source and live in the browser. The purpose of this report is to find what's left, not to relitigate what's already been fixed.

---

## Consistency

**Strong, deliberate consistency exists at the architectural level.** Both screens share: the same three-tier structure (`mc-tier-1/2/3` CSS classes, reused verbatim), the same hero-card pattern (largest scale, one-time entrance pulse via `mc-hero`/`mc-hero--enter`, the only place the Emphasis surface material appears), the same `MetricArc` primitive, the same per-section Demo Mode fallback mechanism (`Promise.allSettled`, fault-isolated per section, never a single global flag), and — confirmed byte-identical in both files — the exact same Demo Mode banner copy ("Demo — every value on this screen is simulated..." / "Demo data — {sections} could not be loaded live right now..."). This is a genuinely rare level of real, verified sibling-screen consistency for this product's history.

**What's inconsistent sits one layer below that shared architecture**, in the details each screen filled in independently:

- The internal vocabulary used to track which sections are live differs completely between the two screens for no functional reason: Mission Control's `SECTION_LABELS` keys are `brief`/`portfolio`/`riskOpportunity`/`claimsChanging`/`marketPulse`/`feed` (6 keys); Portfolio Workspace's are `overview`/`claims` (2 keys, coarser granularity — e.g. a claims-fetch failure is reported only as "Claims Affecting Your Portfolio," which doesn't make clear that "Which Positions Need Attention" is also affected, since that section is derived from the same fetch).
- Internationalization is applied inconsistently between the two screens. Portfolio Workspace routes almost all of its user-facing copy through `t()` (`t("portfolioWorkspace.title")`, `t("portfolioWorkspace.sections.whyThisAffectsYou")`, etc.); Mission Control has no `t()` calls at all — every string ("Today's briefing," "Attention: High," section labels) is hardcoded English. Both screens, however, hardcode the Demo Mode banner copy identically in English regardless of locale — the one piece of copy most directly about trust is the one neither screen translates.

## Reusability

`MetricArc`, `Badge`, `Card`, `EmptyState`, `Section`/`Stack`/`Grid` (the NOVA layout primitives) are all genuinely reused rather than reimplemented — confirmed by import statements in both files pulling from the same `../components/nova` and `../components/layout` modules, not local copies. This is real, working reusability, not just intent.

The one place reuse breaks down: Mission Control's `attentionLevelTone()`, `directionTone()`, and `statusTone()` helper functions are defined locally inside `MissionControlHomeScreen.jsx` and are not shared with `PortfolioWorkspaceScreen.jsx`, even though Portfolio Workspace renders the same `expectedDirection` (`BULLISH`/`BEARISH`) values and would need the identical mapping if it ever needs to render a direction badge outside its currently-narrower claim list. Right now this hasn't caused a visible bug because Portfolio Workspace inlines its own equivalent directly (`claim.expectedDirection === "BULLISH" ? "positive" : ...`), but it means the direction→tone mapping exists as two independent, hand-copied implementations rather than one shared function — a latent drift risk, not yet a live bug.

## Naming

This is the weakest dimension found in this audit. The platform currently uses at least **three different vocabularies for the same underlying concept — "how much does this deserve the user's attention right now"** — depending on which screen you're looking at:

| Screen | Vocabulary used |
|---|---|
| Home ("Your morning brief") | "Matters today: 3" / "Can wait: 24" |
| Mission Control | `Badge`: "Attention: High" / "Attention: Medium" / "Attention: Low" |
| Portfolio Workspace | No categorical label at all — only the raw `MetricArc` number, with plain text "Claims affect this position" / "No claims affecting this position" |

All three are presentation-only views over the same real, single Attention Engine score. A user moving between these three screens in one session encounters three different words for the identical concept, with no shared term connecting them. This is a naming inconsistency the Design Bible's own stated philosophy argues directly against (§2.8's "nothing is equal" principle exists specifically so that *when* something is presented as equivalent, it actually is — the inverse failure, presenting the same thing as apparently different concepts, is just as much a violation of that principle).

## UX language

Empty-state and disclosure copy is the strongest area found in this audit — genuinely excellent, and directly traceable to the Design Bible's own §10 (Empty States) guidance. Multiple empty-state strings are **verbatim, word-for-word matches** between the Bible's own worked examples and the shipped product:

- Bible: *"No prior-day snapshot yet — this is the first day being tracked."* — shipped, verbatim, in both Mission Control's Portfolio Intelligence card and Portfolio Workspace's own equivalent.
- Bible: *"Rebalance suggestions aren't available yet — this app doesn't generate them today. Nothing is shown here rather than a guess."* — shipped, verbatim, in Portfolio Workspace's Rebalance Suggestions section.

This is real discipline, not coincidence — the three-part "why / what's missing / what happens next" structure the Bible prescribes is followed consistently across every empty state checked live in both screens.

## Metric usage

This is where the most significant, concrete finding of this audit sits. `MetricArc.jsx` itself is a genuine, well-reasoned fix: it explicitly separates Confidence, Probability, and Attention into three independently-colored, independently-labeled renderings, with Attention deliberately using a fixed, non-banded brand hue specifically because — per the component's own header comment, directly citing Design Bible §5 — *"the Attention hue is reserved exclusively for the Attention Score system... reusing it anywhere else would dilute the one signal."*

**That rule is honored inside `MetricArc` but broken immediately next to it, in the `Badge` rendered beside it.** `attentionLevelTone()` in `MissionControlHomeScreen.jsx` maps a High attention level to the `warning` tone. That same `warning` tone is independently used by `confidenceBand()` in `Badge.jsx` for a *Moderate confidence* claim, and by `statusTone()` for a *weakening* claim. All three are rendered with the literal same color (`--nova-color-warning`, an amber). This means, concretely: a claim the platform is only moderately confident about, a claim whose thesis is getting weaker, and an item that most deserves the user's attention right now can all show the identical amber badge color on the same screen — the exact collision the Bible's Attention-hue rule, and the `MetricArc` fix sitting one component away, were built specifically to prevent. The fix was applied to the instrument (the Arc) but not carried through to the label sitting directly beside it (the Badge).

## Attention hierarchy

Within each screen individually, attention hierarchy is well executed and confirmed live: the hero item is unambiguously the largest, most visually dominant element on both Mission Control and Portfolio Workspace, both using the identical `mc-hero`/`mc-hero--enter` treatment. Across screens, hierarchy concepts diverge in the same way naming does (see above) — "High Attention," "Matters today," and an unlabeled `MetricArc` number are three different visual/verbal treatments of a ranking claim that is, underneath, the exact same real score.

## Empty states

Excellent and consistent, both in wording (see UX language above) and presentation — the same `◇` icon is used for every empty state checked in both screens, and the honest three-part structure (why / what's missing / what's next) holds throughout. This is the single most consistent dimension found in this audit.

## Demo Mode

Excellent, and confirmed live: with the guest account's real data genuinely empty today (no active Claims), both screens correctly rendered their real, honest empty states with **no** Demo Mode banner shown at all — proving the "an honestly empty real result is not a Demo Mode condition" distinction, stated as a design intent in both files' comments, actually holds in practice and not just on paper. The banner copy itself, when it does need to appear, is identical between the two screens (confirmed via source comparison), which is exactly the right outcome for two screens sharing this pattern. The one gap: this important trust-relevant copy is hardcoded English in both screens with no localization path, unlike most of Portfolio Workspace's other copy.

## Interaction patterns

Consistent where the two screens share a literal pattern (expand/collapse via a `Button` reading "Show more"/"Show less", the staggered brief-row entrance, the one-time hero pulse). One divergence worth noting: Mission Control's `BriefRow` items are rendered as real `<button>` elements with `aria-expanded`, making them independently keyboard-focusable and screen-reader-legible as toggle controls; Portfolio Workspace's equivalent list items (`positionAttention` rows) are plain `<li>` elements with no interactive affordance at all — they're not meant to expand, so this isn't a defect, but it does mean the two screens don't share one single "this is how a list row behaves" convention; a future screen copying either one as a template could reasonably copy the wrong pattern for its own needs without a documented rule to check against.

---

See [PRODUCT_STYLE_GAPS.md](../../planning/PRODUCT_STYLE_GAPS.md) for every inconsistency found here, ranked, and [PLATFORM_STANDARDIZATION_PLAN.md](../../architecture/PLATFORM_STANDARDIZATION_PLAN.md) for the prioritized plan to close them.
