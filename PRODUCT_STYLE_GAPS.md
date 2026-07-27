# Product Style Gaps

Every finding below was verified directly — either in the actual shipped source (`MissionControlHomeScreen.jsx`, `PortfolioWorkspaceScreen.jsx`, `MetricArc.jsx`, `Badge.jsx`, `IMPACTONE_DESIGN_BIBLE.md`) or by loading and interacting with both screens live in a running instance. Ranked CRITICAL / HIGH / MEDIUM / LOW.

---

## HIGH

### H1. The Attention badge tone collides with Confidence and Status tones — the exact conflation `MetricArc` was built to prevent, one component away from where it was fixed
`attentionLevelTone()` (in `MissionControlHomeScreen.jsx`) maps a High attention level to the `warning` Badge tone. `confidenceBand()` (in `Badge.jsx`) independently maps a Moderate confidence score to the same `warning` tone. `statusTone()` maps a weakening claim to the same `warning` tone again. All three render as the identical amber (`--nova-color-warning`). Design Bible §5 states the Attention hue must be "reserved exclusively for the Attention Score system... reusing it anywhere else would dilute the one signal" — `MetricArc.jsx` itself correctly honors this (a fixed, non-banded brand hue for Attention, confirmed in its source), but the `Badge` rendered directly beside every `MetricArc` instance does not. A user can see a High-Attention item, a Moderate-confidence item, and a weakening item all wearing the same color badge on the same screen.

### H2. No shared vocabulary for "attention" across sibling screens
Confirmed live and in source: Home uses "Matters today" / "Can wait," Mission Control uses a categorical "Attention: High/Medium/Low" Badge, and Portfolio Workspace uses only a raw, unlabeled `MetricArc` number with generic surrounding text ("Claims affect this position"). All three present the identical underlying Attention Engine score under three unrelated names, with no shared term a user could carry from one screen to the next.

### H3. Internationalization coverage is inconsistent between the two screens built on "the same architecture"
`PortfolioWorkspaceScreen.jsx` routes the large majority of its copy through `t()`; `MissionControlHomeScreen.jsx` has zero `t()` calls — every string is hardcoded English. Both screens, however, hardcode the Demo Mode disclosure banner identically in English regardless of locale, meaning the single most trust-relevant piece of copy on either screen is the one neither screen localizes.

---

## MEDIUM

### M1. Section-tracking vocabulary for Demo Mode differs in both naming and granularity between the two screens
Mission Control tracks 6 independently-failable sections (`brief`/`portfolio`/`riskOpportunity`/`claimsChanging`/`marketPulse`/`feed`); Portfolio Workspace tracks 2 (`overview`/`claims`). Beyond the coarser granularity, the label shown to the user when Portfolio Workspace's `claims` fetch fails ("Claims Affecting Your Portfolio") doesn't make clear that the "Which Positions Need Attention" section is also affected, since that list is derived from the same underlying claims fetch.

### M2. Direction/status-to-tone mapping is duplicated rather than shared
`directionTone()`/`statusTone()` are defined locally in `MissionControlHomeScreen.jsx` and not exported or reused; `PortfolioWorkspaceScreen.jsx` inlines its own separate, currently-matching implementation for direction tone. Two independent, hand-copied implementations of the same mapping is a real drift risk even though the two currently agree.

### M3. List-row interactivity convention differs between the two screens with no documented rule
Mission Control's `BriefRow` items are real `<button>` elements with `aria-expanded`, independently focusable and legible as toggles to assistive technology. Portfolio Workspace's equivalent `positionAttention` rows are plain, non-interactive `<li>` elements. This isn't wrong for either screen's current needs, but there is no written convention for which pattern a future third screen should copy.

### M4. "Which Positions Need Attention" card title is hardcoded while its sibling card in the same screen is translated
Within `PortfolioWorkspaceScreen.jsx` itself, `t("portfolioWorkspace.sections.whyThisAffectsYou")` is used for one Tier 2 card title but `"Which Positions Need Attention"` (its neighbor) is hardcoded — an inconsistency within a single file, not just between screens.

---

## LOW

### L1. Mission Control's closing summary line has a grammar issue at zero-count
Confirmed live: with zero brief items today, the session summary rendered "That's today's briefing: 0 item needs your attention, 0 are worth knowing, and 0 are quiet." — "0 item" should pluralize to "0 items."

### L2. The Design Bible's own section numbering is internally inconsistent
`IMPACTONE_DESIGN_BIBLE.md` cross-references "§9, Empty States" in its own body text, but the actual Empty States section is numbered "## 10." A minor authoring inconsistency within the reference document itself, worth a quick pass since this document is cited by name in both screens' code comments as the source of truth.

### L3. The `◇` empty-state icon is a de facto, undocumented convention
Both screens use the identical `◇` glyph for every empty state, which is a genuinely good, consistent outcome — but this specific icon choice isn't specified anywhere in the Design Bible's §10 (Empty States) guidance itself. It currently works only because both screens happened to copy the same value; nothing documents it as the required icon for a third screen to follow.

---

## What's explicitly *not* a gap (confirmed, not assumed)

- The three-tier layout, hero-card treatment, `MetricArc` primitive, and per-section Demo Mode fallback pattern are genuinely, verifiably shared between Mission Control and Portfolio Workspace — not just similar in spirit.
- Demo Mode banner copy is byte-identical between the two screens where it does appear.
- Empty-state wording follows the Design Bible's §10 structure consistently, with several strings matching the Bible's own worked examples verbatim.
- The honest-empty-vs-demo-fallback distinction was confirmed live, not just in source comments: with genuinely empty real data, neither screen showed a Demo Mode banner.
