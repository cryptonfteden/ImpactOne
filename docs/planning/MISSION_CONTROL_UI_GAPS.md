# Mission Control — UI Gaps (As Shipped)

Every finding below was verified directly — either by reading the shipped source (`MissionControlHomeScreen.jsx`, `ConfidenceArc.jsx`, `missionControlMockData.js`) or by interacting with the live, running screen at 1440×1024 and 390×844. Ranked CRITICAL / HIGH / MEDIUM / LOW.

---

## CRITICAL

### C1. Screen ships with 100% fixed mock data and no in-UI disclosure to the user
Every field on the screen — the hero claim, the brief items, the portfolio total, the risk/opportunity claims, claims changing, market pulse — comes from `missionControlMockData.js`, a static, deterministic module with no network calls. Confirmed live: reloading the page produces byte-identical output every time, regardless of session. The code's own header comment discloses this to any future engineer reading the file, but **nothing in the rendered UI tells a real user this is placeholder content.** A user would reasonably believe "NVDA demand outpaces supply through Q3" and "$150,868 total value" describe their actual portfolio. This is the single most release-blocking issue on the screen; full treatment in `MISSION_CONTROL_RELEASE_READINESS.md`.

### C2. Confidence Arc mislabels Attention Score as "Confidence"
`ConfidenceArc` is used for two different metrics — Attention Score (hero, Brief rows) and true claim Confidence (Biggest Risk, Best Opportunity, Market Pulse) — but every instance shares the same default accessible label, which hardcodes the word "Confidence" whenever no custom `label` prop is passed. Neither the hero nor any `BriefRow` passes a custom label. Confirmed live: the hero's computed accessible name is `"Confidence 91 out of 100 — Very High"` for a value the data model itself calls `attentionScore`. This directly contradicts the platform's own established discipline (verified repeatedly in the Claim Intelligence Layer) of never conflating distinct scoring concepts. Ranked CRITICAL rather than HIGH because it's a live, user-facing, accessibility-tree-visible mislabeling of a term ("confidence") that has real financial-decision meaning elsewhere in this exact product.

---

## HIGH

### H1. "Show more" is functionally inert on Biggest Risk / Best Opportunity
Confirmed live: clicking "Show more" on either `SignalCard` toggles the button label to "Show less" but produces no visible change in rendered content — the plain-language statement and first evidence line were already fully shown pre-expansion. Root cause (confirmed by source read): `SignalCard` renders `claim.portfolioImpact` nowhere at all, despite the mock data defining it and the masterplan's own "expanded state" spec calling for it. The result is a button that appears to do nothing, which erodes trust in every other interactive affordance on the screen.

### H2. Mobile header consumes ~25% of the viewport, permanently, pushing the hero below the fold
Confirmed live at 390×844: the sticky header (brand row, search bar, market pill, 4 stacked icon buttons) remains fixed at the top through scroll and occupies roughly a quarter of total viewport height. On first load, "Today's briefing" and the hero's headline sit at the very bottom of the visible area, with the gauge itself cut off. This is a pre-existing shared Header issue, not newly introduced by this rebuild, but it directly undermines "exactly one visual starting point, immediately" (review Q2) on the device class most likely to be used for a quick morning check.

### H3. "Upcoming Events" mock data exists but is not rendered anywhere
`missionControlMockData.js` exports `upcomingEvents` (2 items); `MissionControlHomeScreen.jsx` never imports or renders it. Confirmed absent from the live DOM. Not documented as an intentional cut in the portion of `REVISION_NOTES.md` reviewed. Needs an explicit decision: either wire it in, or remove the dead export and confirm the cut was deliberate.

---

## MEDIUM

### M1. Portfolio Intelligence is the visually generic card on the screen
It doesn't use the Confidence Arc (correctly, since it isn't a scored claim) but as a side effect it reads as a standard stat-block/list widget indistinguishable from typical fintech account summaries — the one card on the page without a distinctive visual treatment.

### M2. "Claims Changing" section header still uses platform jargon even though its content doesn't
The three list items underneath use excellent plain language ("Getting more likely," "Getting less likely," "No longer holds up"), but the section heading itself, "Claims Changing," retains the internal term "Claims." Minor relative to the real jargon fixes already made, but an inconsistency worth closing given how carefully the rest of the section was de-jargoned.

### M3. NVDA appears as both the Hero item and the Best Opportunity item
The mock data's hero ("NVDA demand outpaces supply through Q3") and Best Opportunity ("NVDA looks set to keep beating expectations...") are the same symbol and closely related theses. In the live render this reads as mildly repetitive rather than reinforcing — a user's eye sees "NVDA" twice in the first two sections with similar bullish framing. Worth checking whether this is a mock-data coincidence or would also occur with real data (e.g., should Best Opportunity actively exclude whatever symbol the current hero already covers).

---

## LOW

### L1. No in-app timestamp/freshness indicator beyond "Updated this minute"-style copy seen on the separate Home screen
Mission Control itself doesn't surface when the briefing was last assembled, beyond the `INITIAL_LOAD_DELAY_MS` skeleton transition. Low priority since this is arguably a data-wiring concern deferred to the next phase already, but worth tracking so it isn't lost.

### L2. Loading skeleton's `aria-label="Assembling today's briefing"` is well-written but only fires for 300ms
Confirmed via source read (`INITIAL_LOAD_DELAY_MS = 300`). Cosmetic only — flagged so it isn't mistaken for a real loading state once live data (with real latency) is wired in; the current artificial delay is not representative of production load times.
