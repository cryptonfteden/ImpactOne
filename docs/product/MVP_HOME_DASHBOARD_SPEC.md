# ImpactOne MVP Home Dashboard Specification

**Document Type:** Official Product Specification  
**Scope:** MVP Home Dashboard only  
**Audience:** Product, Design, and Frontend Engineering  
**Intent:** Define the complete production-ready home dashboard experience for first use and daily use

---

## 1. Purpose

The Home Dashboard is the primary daily entry point for ImpactOne. It must answer, in order:

1. What changed in the market?
2. What matters to me specifically?
3. What should I do next?

The dashboard should feel like a private investment command center. It must be calm, fast to scan, deeply personalized, and focused on decision-making rather than raw data display.

The dashboard is not a generic summary page. It is the product’s habit-forming surface and should become the first screen the user opens every day.

---

## 2. User Goals

The dashboard must support the following user goals:

- Understand market context in under 30 seconds.
- See the most important changes since the previous session.
- Understand how those changes affect the user’s watchlist or portfolio.
- Identify the top 3 to 5 actions worth taking now.
- Ask a natural language question without leaving the page.
- Save, dismiss, or act on an idea with one click.
- Review brief history when the user wants continuity or comparison.

---

## 3. Screen Layout, Top to Bottom

The Home Dashboard is composed of the following sections in this exact order:

1. Top App Bar
2. Market Context Strip
3. Daily Brief Hero
4. Priority Intelligence Cards
5. Portfolio Risk Panel
6. Watchlist Priority Panel
7. Ask ImpactOne Panel
8. Opportunity Module
9. Daily Brief Archive Preview
10. Footer Utility Area

This order is intentional and must be preserved in the MVP.

---

## 4. Section Specifications

### 4.1 Top App Bar

**Purpose**  
Provide global orientation, fast access to search, alerts, and account controls.

**Layout**  
- Fixed top bar spanning full width.
- Left aligned brand or workspace label.
- Center aligned global search / ask field.
- Right aligned alert, profile, and quick action controls.

**Components**

- Brand logo or workspace label
- Global search / ask input
- Alerts icon with unread count badge
- Profile avatar or account menu
- Quick actions menu

**AI Widgets**

- Search suggestions based on user context
- Query shortcuts for common tasks

**User Interactions**

- Open universal search
- Open alerts
- Open account menu
- Launch quick actions

**Empty State**

- If no alerts exist, hide the badge.
- If no recent search context exists, show a neutral placeholder in the search field.

**Loading State**

- Static top bar remains visible.
- Search suggestions may load progressively.

**Error State**

- If the search service fails, preserve navigation and show a small inline notice such as “Search temporarily unavailable.”

**Responsive Behavior**

- **Mobile:** Compact top row, search may collapse into a tappable field or icon.
- **Tablet:** Full top bar with reduced spacing.
- **Desktop:** Full-width persistent bar with centered search field.

**Example Content**

- Search placeholder: “Ask about a ticker, portfolio, or market event”
- Alerts badge: “3”

**Acceptance Criteria**

- The bar remains visible during scrolling.
- Search is accessible within one tap or click.
- Alerts and account access are always reachable.

---

### 4.2 Market Context Strip

**Purpose**  
Give the user a one-line market frame before any deeper content.

**Layout**  
- Thin horizontal strip directly below the top app bar.
- Left: market status.
- Center: major index movement.
- Right: key event or market headline.

**Components**

- Market status pill
- Major index summary text
- Macro context text
- Key event chip

**AI Widgets**

- Short market interpretation summary

**User Interactions**

- Click index summary to open market overview.
- Click event chip to open event detail.

**Empty State**

- Show “Market status unavailable” with a last updated timestamp.

**Loading State**

- Single-line shimmer or skeleton text placeholders.

**Error State**

- If market data is delayed, show a visible delayed-data label.

**Responsive Behavior**

- **Mobile:** Condense into two lines if necessary.
- **Tablet:** Single line where possible.
- **Desktop:** Single compact strip across full width.

**Example Content**

- “Market open: Mixed”
- “S&P 500 +0.4%, Nasdaq +0.7%, Russell flat”
- “Today’s key event: FOMC minutes at 2 PM”

**Acceptance Criteria**

- The strip must never dominate the page.
- It must provide context in under 5 seconds.
- It must remain readable at a glance on all supported breakpoints.

---

### 4.3 Daily Brief Hero

**Purpose**  
Deliver the main daily answer: what changed and why it matters.

**Layout**  
- Large hero card near the top of the main content.
- Left side: summary text and supporting bullets.
- Right side: compact visual support such as a sparkline or market chart.
- Bottom row: optional action chips.

**Components**

- Brief title
- Summary paragraph
- Confidence badge
- “Why this matters” bullets
- Primary action button
- Secondary action button
- Supporting chart or sparkline
- Optional source preview

**AI Widgets**

- AI-generated summary
- Confidence indicator
- Follow-up prompt entry or chips
- Citation drawer or source stack

**User Interactions**

- Expand or collapse the summary.
- Open deeper explanation.
- Save the brief.
- Share the brief.
- Ask a follow-up question.

**Empty State**

- If no brief is available yet, show a starter message such as “Your daily brief will appear here after the next refresh.”

**Loading State**

- Skeleton text lines.
- Placeholder chart.
- Summary content should appear before lower-priority supporting data.

**Error State**

- If AI summary generation fails, show a fallback rule-based summary and a retry action.

**Responsive Behavior**

- **Mobile:** Stack text above chart, preserve the title and summary first.
- **Tablet:** Allow side-by-side layout if space permits.
- **Desktop:** Full hero card with clear left-right split.

**Example Content**

- Title: “Today’s market setup”
- Summary: “Semiconductor guidance pressure and weaker rate-cut expectations are shifting attention toward defensives and cash-generative software.”
- Bullets:
  - “NVDA remains strong but valuation sensitivity has increased.”
  - “AMAT and AMD show higher near-term catalyst risk.”
  - “Financials are stable, but breadth is narrowing.”

**Acceptance Criteria**

- The hero must answer the user’s main question immediately.
- The summary must be visible without scrolling.
- The user must be able to take action from the hero without leaving the dashboard.

---

### 4.4 Priority Intelligence Cards

**Purpose**  
Surface the 3 to 5 most important items the user should review next.

**Layout**  
- Card grid below the hero.
- Three columns on desktop, two on tablet, one on mobile.

**Components**

- Alert cards
- Opportunity cards
- Risk cards
- Catalyst cards
- Each card includes title, summary, relevance tag, and footer actions

**AI Widgets**

- Relevance rank label
- AI explanation of why the item is prioritized
- Suggested next action

**User Interactions**

- Open card detail.
- Save item.
- Dismiss item.
- Snooze item.
- Sort by relevance, portfolio impact, or recency.

**Empty State**

- Show “No high-priority items right now” and a lower-signal fallback suggestion list.

**Loading State**

- Skeleton cards with title and summary placeholders.

**Error State**

- If ranking is unavailable, sort by recency and label items as unranked.

**Responsive Behavior**

- **Mobile:** Single-column stack of cards.
- **Tablet:** Two-card row grid.
- **Desktop:** Three-card row grid.

**Example Content**

- “High risk: AMAT guidance compression”
- “Opportunity: cash-generative software names gaining relative strength”
- “Watchlist move: NFLX post-earnings revision trend improving”

**Acceptance Criteria**

- Cards must be scannable within 3 seconds.
- Cards must clearly communicate relevance and action.
- The section must never feel like a random feed.

---

### 4.5 Portfolio Risk Panel

**Purpose**  
Explain what the user’s holdings are exposed to right now.

**Layout**  
- Desktop right rail or second content column.
- Summary card at top.
- Risk breakdown below.
- Suggested actions at bottom.

**Components**

- Portfolio summary card
- Concentration badge
- Risk level indicator
- Sector exposure mini chart
- Top 3 risk names
- Action suggestions

**AI Widgets**

- Hidden concentration detector
- Exposure explanation
- Suggested rebalance actions

**User Interactions**

- Click a holding to open portfolio or ticker detail.
- Click a risk flag to see explanation.
- Open simulation or review exposure flow.

**Empty State**

- If no portfolio exists, show “Connect holdings to see personalized risk.”

**Loading State**

- Summary values load first.
- Chart and detail rows load after.

**Error State**

- If portfolio sync fails, show last known sync time and a partial data warning.

**Responsive Behavior**

- **Mobile:** Moves below the brief and priority cards as a stacked section.
- **Tablet:** Stacked card group with optional chart collapse.
- **Desktop:** Right rail or 2-column layout depending on viewport width.

**Example Content**

- “You are 42% exposed to AI infrastructure.”
- “Top concentration: NVDA, MSFT, and AVGO.”
- “Risk note: earnings sensitivity has risen across semis.”

**Acceptance Criteria**

- The user must understand portfolio risk at a glance.
- Risk must be tied to actionable recommendations.
- If no portfolio exists, the section must still feel useful, not empty.

---

### 4.6 Watchlist Priority Panel

**Purpose**  
Show the user’s tracked names ranked by urgency.

**Layout**  
- Compact list section below portfolio or in an adjacent column on desktop.
- Ordered by relevance.

**Components**

- Watchlist title
- Ranked ticker rows
- Short reason text
- Sparkline or change percent
- Relevance score

**AI Widgets**

- Ranking logic
- Short explanation tag
- Suggested new additions

**User Interactions**

- Open ticker detail.
- Pin, mute, or remove a name.
- Search within the watchlist.

**Empty State**

- Show starter watchlists by style.

**Loading State**

- Row skeletons and sparkline placeholders.

**Error State**

- Label delayed symbols clearly.

**Responsive Behavior**

- **Mobile:** Stack rows vertically.
- **Tablet:** Compact list with optional 2-column break.
- **Desktop:** Dense ranked list with hover actions.

**Example Content**

- NVDA — “Still strongest, but valuation sensitivity rising”
- AAPL — “Low event risk, stable trend”
- AMAT — “Near-term catalyst risk elevated”

**Acceptance Criteria**

- The section must tell the user what to watch now.
- Ranking must be explainable.
- Actions must be available within one click or tap.

---

### 4.7 Ask ImpactOne Panel

**Purpose**  
Let users ask natural language questions directly from the dashboard.

**Layout**  
- Desktop: right rail or pinned panel.
- Mobile: expandable card or bottom sheet.
- Includes input, suggestions, and answer area.

**Components**

- Ask input
- Suggested prompt chips
- AI answer preview
- Source snippets
- Follow-up buttons

**AI Widgets**

- Natural-language answer generator
- Clarifying question fallback
- Citation block
- Confidence indicator

**User Interactions**

- Ask a question.
- Click a prompt chip.
- Open sources.
- Continue with follow-up prompts.

**Empty State**

- Show suggested prompts, for example:
  - “Why is semis weak today?”
  - “What is the biggest risk in my portfolio?”
  - “Which watchlist name should I watch closely?”

**Loading State**

- Streaming answer text.
- Skeleton citations.

**Error State**

- If the answer cannot be generated, show a plain-language fallback and a retry action.

**Responsive Behavior**

- **Mobile:** Full-width bottom sheet or stacked card.
- **Tablet:** Slide-over panel or sidebar card.
- **Desktop:** Persistent rail panel.

**Example Content**

- Query: “What changed in semis today?”
- Answer: “Guidance tone weakened across the group, and ImpactOne ranks AMD and AMAT as more exposed than NVDA.”

**Acceptance Criteria**

- The user must be able to ask a question without navigating away.
- The answer must include evidence or citations.
- The panel must encourage follow-up, not dead-end responses.

---

### 4.8 Opportunity Module

**Purpose**  
Surface new names and themes worth attention.

**Layout**  
- Lower section of the dashboard.
- Cards or ranked list depending on viewport width.

**Components**

- Opportunity cards
- Title
- Reason
- Catalyst
- Confidence
- Save button

**AI Widgets**

- Opportunity ranking
- Why-now explanation
- Similarity to user holdings

**User Interactions**

- Save idea.
- Add to watchlist.
- Open thesis.
- Compare with current holdings.

**Empty State**

- Show “No strong opportunities detected today” with a few lower-priority ideas.

**Loading State**

- Card skeletons.

**Error State**

- If discovery data is unavailable, show a static market scan summary.

**Responsive Behavior**

- **Mobile:** Single-column cards.
- **Tablet:** Two-column grid.
- **Desktop:** Horizontal cards or multi-column ranking list.

**Example Content**

- “Cash-generative software names are outperforming after margin revisions.”
- “Large-cap defensives are gaining relative strength.”

**Acceptance Criteria**

- Opportunity content must be actionable.
- Each card must have a clear reason to exist.
- The user must be able to save or investigate in one action.

---

### 4.9 Daily Brief Archive Preview

**Purpose**  
Provide continuity and historical context inside the dashboard.

**Layout**  
- Small section near the bottom or in a secondary column.
- Compact list of recent brief entries.

**Components**

- Date chips or timeline rows
- Brief summary preview
- Compare button

**AI Widgets**

- Change summary between dates

**User Interactions**

- Open prior brief.
- Compare today vs yesterday.
- Save a note.

**Empty State**

- “Your archive will appear here after a few days.”

**Loading State**

- Date chip skeletons.

**Error State**

- If archive retrieval fails, show the latest available brief only.

**Responsive Behavior**

- **Mobile:** Condensed recent history stack.
- **Tablet:** Compact rows with compare action.
- **Desktop:** List or card preview with more visible comparison affordance.

**Example Content**

- “Yesterday: cyclicals were stronger.”
- “Last week: AI capex names were leading.”

**Acceptance Criteria**

- The user must be able to revisit recent context without leaving the dashboard.
- The section must reinforce continuity over time.

---

### 4.10 Footer Utility Area

**Purpose**  
Provide access to low-priority support and account utilities without cluttering the main dashboard.

**Layout**  
- Thin bottom utility strip or footer area.

**Components**

- Settings link
- Help link
- Feedback link
- Terms link
- Status link
- Product updates link

**User Interactions**

- Open support.
- Open release notes.
- Send feedback.

**Empty State**

- Not applicable.

**Loading State**

- None needed.

**Error State**

- If support is unavailable, show a fallback contact path.

**Responsive Behavior**

- **Mobile:** Collapse into a compact footer menu.
- **Tablet:** Compact utility row.
- **Desktop:** Small footer links with low visual emphasis.

**Example Content**

- System status: healthy

**Acceptance Criteria**

- Utility controls must never compete with primary dashboard content.
- Support and status access must remain discoverable.

---

## 5. Responsive Behavior Summary

### Mobile

- Single-column layout.
- Brief and priority content remain above the fold.
- Right-rail content collapses into stacked cards, slide-over panels, or bottom sheets.
- Tables become stacked rows or condensed cards.

### Tablet

- Balanced two-column layout where appropriate.
- Side panels may collapse into overlays or stacked modules.
- Card density can increase slightly without losing readability.

### Desktop

- Full 12-column grid.
- Best use of side rail, supporting panels, and side-by-side comparisons.
- All primary dashboard modules should be visible without excessive scrolling.

---

## 6. Global Empty State Rules

- Never show a blank dashboard.
- If the portfolio is missing, emphasize watchlists and starter suggestions.
- If the watchlist is missing, emphasize starter lists and sample ideas.
- If alerts are missing, show a concise market summary.
- If AI content is missing, show a rule-based fallback.

---

## 7. Global Loading State Rules

- Load the daily brief first.
- Keep layout structure stable while loading.
- Use skeleton cards instead of spinners for most modules.
- Preserve last-known data while refreshing live modules.

---

## 8. Global Error State Rules

- Fail one module at a time, not the entire dashboard.
- Keep stale data visible if fresh data fails.
- Explain what failed and whether the data is stale.
- Always provide retry or fallback actions.

---

## 9. Example Dashboard Content Snapshot

- Market strip: “Market open: Mixed”
- Brief: “Semiconductor guidance pressure and weaker rate-cut expectations are shifting attention toward defensives and cash-generative software.”
- Priority card: “High risk: AMAT guidance compression”
- Portfolio risk: “You are 42% exposed to AI infrastructure.”
- Watchlist priority: “NVDA — valuation sensitivity rising”
- Ask panel prompt: “What is the biggest risk in my portfolio?”
- Opportunity: “Cash-generative software names are outperforming.”
- Archive preview: “Yesterday: cyclicals were stronger.”

---

## 10. Acceptance Criteria by Section

### Top App Bar
- Search, alerts, and account access are always available.
- The bar remains visible on scroll.

### Market Context Strip
- The user gets a market frame in one glance.
- The strip stays compact and readable.

### Daily Brief Hero
- The screen answers what changed.
- The brief is visible without scrolling.

### Priority Intelligence Cards
- The top 3 to 5 items are clearly ranked.
- Each card is actionable and explainable.

### Portfolio Risk Panel
- Portfolio exposure is understandable at a glance.
- The section ties risks to actions.

### Watchlist Priority Panel
- The user knows which names matter most now.
- Ranking is transparent.

### Ask ImpactOne Panel
- A user can ask a question without leaving the dashboard.
- Answers include evidence or citations.

### Opportunity Module
- The user can discover new ideas quickly.
- Each idea has a clear reason and next step.

### Daily Brief Archive Preview
- The user can revisit recent summaries.
- Historical continuity is visible and useful.

### Footer Utility Area
- Low-priority actions are accessible but unobtrusive.

---

## 11. Implementation Notes for Design and Engineering

- Keep the page opinionated and calm.
- Do not surface too many equally weighted items.
- Default to the highest relevance content first.
- Preserve continuity during loading and refresh states.
- Treat AI output as a product surface with explicit trust cues.
- The dashboard should be useful even when some data sources are unavailable.

---

## 12. Final Product Rule

If a user opens the Home Dashboard, they should immediately understand:

1. What happened,
2. Why it matters to them,
3. What they should do next.

If the screen does not accomplish those three things, it is not ready for MVP.
