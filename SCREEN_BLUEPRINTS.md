# Screen Blueprints — Phase X1 (Part 3)

Design-only. Every screen below follows `PRODUCT_EXPERIENCE_BLUEPRINT.md`'s philosophy; every visual token referenced here is specified in `DESIGN_LANGUAGE.md`. No code, no CSS.

---

## Today

**Primary question:** "What do I need to know right now, before I do anything else?"

**Layout structure:** Single-column feed on mobile; a two-column layout on desktop (a narrow left "at-a-glance" rail: freshness timestamp, three glance pills — action needed / portfolio changed / beliefs updated; a wide right column of stacked cards). Card order is adaptive (server-ranked by real signal, existing infrastructure) but always follows the philosophy's priority: what happened → why it matters → what to watch → portfolio impact → active alerts.

**Information hierarchy:** 1) A single hero line at the top — the one thing today that matters most, in the largest type on the screen. 2) The adaptive card stack, each card following answer → evidence → action. 3) Active Alerts card always last — the "connective tissue" back to Workspaces.

**Primary CTA:** "Ask AI about this" — present on every card, one tap into the AI pillar with that card's context pre-loaded.

**Secondary actions:** "Track this" (saves the card's subject to a Workspace folder without leaving Today); "View portfolio impact" (jumps to Portfolio scoped to the affected position); timeline section switcher (Overnight / Opening Bell / Today / This Week / Long Term) for the Intelligence Timeline card.

**Empty state:** A first-session user with no portfolio, no workspace, and no graded history sees an honest, warm "still building your picture" state — never padded with fake content. Copy explicitly tells the user what to do next (add a position, or track a symbol) rather than leaving a void.

**Loading state:** A branded skeleton matching the real card shapes (not generic gray bars) — the hero line skeleton is the widest, largest element, so the loading state itself communicates "something important is about to appear here."

**Error state:** If a refresh fails but a previous session's data exists, the old data stays visible with an honest "last updated" timestamp and a small inline retry — never a blank error page replacing working content.

**Mobile behavior:** Single column, full-width cards, timeline switcher becomes a horizontal scroll of pills. Bottom nav shows Today as the leftmost, default-selected icon.

**Desktop behavior:** Two-column as described; hovering any card surfaces its "Ask AI" / "Track this" actions (mobile shows them inline always, since there's no hover).

---

## Markets

**Primary question:** "What's happening in the world that could matter to me?"

**Layout structure:** A ranked, single-stream feed (desktop: centered column, max-width capped for readability, matching the philosophy's "answer before evidence" rule) — not a multi-column news wall. Each item is a card that expands in place (the Wow Moment) rather than navigating away.

**Information hierarchy:** Headline (largest) → one-line "why it matters" → impact/theme/actionability pills (importance, confidence, horizon, freshness) → expandable evidence trace. Sectors/companies affected and portfolio-impact prediction live inside the expanded state, never cluttering the collapsed card.

**Primary CTA:** "Track this" on every card — the direct bridge into Workspaces, always visible, never buried behind an overflow menu.

**Secondary actions:** "Ask AI" (jumps to AI pillar scoped to this event's primary symbol/theme); source link (external, clearly marked as leaving the product); theme tag tap (filters the feed to that theme).

**Empty state:** Should be structurally rare (the feed is server-ranked from a real pool) — if it ever occurs, state plainly that no ranked events exist right now rather than showing a generic spinner forever.

**Loading state:** Skeleton cards at the exact collapsed-card height, so the page doesn't visibly "jump" once real content arrives — layout stability is part of feeling premium.

**Error state:** Same "keep the last good feed visible, label its age honestly" pattern as Today — a refresh failure is never allowed to blank a working screen.

**Mobile behavior:** Full-width cards, expand-in-place still works (no navigation), theme filter becomes a horizontal chip scroll at the top.

**Desktop behavior:** Centered single column (deliberately not using the full viewport width — matches the philosophy's "answer before evidence," avoiding a dashboard-wall feeling); a persistent theme-filter sidebar optionally available for power users, off by default.

---

## Portfolio

**Primary question:** "What should I actually do about what I hold?"

**Layout structure:** Top: a hero metric strip (total value, daily P/L, total return — real numbers, tabular, largest type on the screen). Below: an "AI Advisor Insights" card (largest hidden risk, biggest opportunity, what deserves attention today — already real infrastructure) placed *above* the raw positions table, because insight outranks inventory in this product's hierarchy. Positions table below that.

**Information hierarchy:** Hero metrics → AI insights (answer-first) → positions (evidence) → trade/performance history (deeper evidence, collapsed by default).

**Primary CTA:** "Place order" (paper trading, clearly labeled simulated) — the one action this screen exists to eventually lead to, even though most visits will end in "watch," not "trade."

**Secondary actions:** "Ask AI about this position" per row; "Move to workspace" per row; "Reset portfolio" (destructive, confirm-gated, tucked at the bottom — never a primary-weight action).

**Empty state:** Zero positions is not an error — it's shown as "your simulated capital, ready to deploy," with the AI Advisor Insights card honestly stating there's nothing to warn about yet, never fabricating a risk that doesn't exist.

**Loading state:** Hero metric strip skeleton loads first/fastest (it's the answer); positions table skeleton follows — reinforcing answer-before-evidence even in the loading sequence.

**Error state:** A failed live-price refresh keeps the last known position values visible, visibly marked stale (not silently wrong) — matches this product's existing "never present stale data as current" convention.

**Mobile behavior:** Hero metrics stack to two rows of two; positions table becomes a card-per-position list (no horizontal scroll) below a certain width.

**Desktop behavior:** Hero metrics in one row; positions as a real table with tabular-numeric columns.

---

## Workspaces

**Primary question:** "What am I personally tracking, and what should I be told about it?"

**Layout structure:** A folder grid (desktop: multi-column card grid; mobile: single column list) — each folder card shows its name, symbol count, and a compact preview of its symbols. Opening a folder reveals its full symbol list plus each symbol's active alerts inline.

**Information hierarchy:** Folder name → symbol list (with live price + any active alert's distance-from-target shown inline, so the folder itself is a living dashboard, not just a container) → per-symbol actions.

**Primary CTA:** "Set alert" on every symbol — this screen's entire reason for existing is turning passive tracking into active notification.

**Secondary actions:** Create folder, rename, delete (confirm-gated), add symbol, remove symbol, move symbol between folders (the Wow Moment — drag, not just a dropdown), deactivate/delete an existing alert.

**Empty state:** No folders yet — an inviting prompt naming the example folders from the mission (AI, Long Term, Waiting for Entry, Space and Defense) as real, one-tap starting suggestions, not just placeholder text.

**Loading state:** Folder-card skeletons at real card proportions; alert rows within an opened folder load a beat after the folder shell, so the structure appears before the live-price-dependent details.

**Error state:** A live-quote failure on an alert shows that specific alert's price as "unavailable right now" (never fabricated) while every other alert with a working quote displays normally — one bad quote never blanks the whole screen.

**Mobile behavior:** Single-column folder list; opening a folder pushes a full-screen detail view (back button returns to the folder grid); "move symbol" becomes a bottom-sheet folder picker (drag doesn't translate well to touch at this information density, so mobile gets an equally fast tap-based equivalent, not a degraded one).

**Desktop behavior:** Multi-column grid; folders can be opened inline (expand in place) or as a focused detail pane; drag-and-drop move between visible folder cards.

---

## AI

**Primary question:** "What should I actually do, and why — for this specific thing I'm curious about?"

**Layout structure:** A persistent question/search entry point at the top (conversational, not just ticker lookup — already real infrastructure). Below: for a specific symbol, a structured single-column deep-dive (verdict → committee reasoning → evidence categories → historical comparison → third-party data, each its own clearly-labeled section, never conflated with the product's own recommendation per the earlier explicit labeling fix).

**Information hierarchy:** Direct answer to the question asked (largest, first) → committee synthesis (the Wow Moment — individual member reasoning, then resolution) → supporting evidence matrix → third-party/analyst data (explicitly, visually separated — never implying it's the same as the system's own verdict).

**Primary CTA:** "Save to workspace" on any answer — the bridge back into Workspaces, completing the daily loop.

**Secondary actions:** "Ask a follow-up" (keeps conversational context); "View full DecisionTrace" (the complete, unabridged evidence — one tap, never mandatory); "Give feedback" (useful / not useful / don't understand — already real infrastructure).

**Empty state:** No question asked yet — the entry point itself, with a few real, rotating example prompts ("Should I buy NVDA?", "What changed overnight?") to teach the conversational capability rather than leaving a blank search box.

**Loading state:** The committee-streaming Wow Moment doubles as the loading state — members' reasoning appearing one at a time isn't just an animation, it's genuinely how the answer is being assembled, so waiting *is* the experience, not a delay before the experience.

**Error state:** If the AI call fails, the screen states plainly that analysis is temporarily unavailable and suggests trying a plain ticker lookup instead (already real, existing degrade-gracefully behavior) — never a generic spinner that never resolves.

**Mobile behavior:** Full-screen single column; the committee-streaming sequence plays at a slightly faster pace to respect a smaller, more impatient viewport.

**Desktop behavior:** Single centered column (matches Markets' restraint — this is a reading/reasoning surface, not a dashboard), with the historical-comparison and third-party-data sections available as a secondary side panel for wide viewports only.

---

## Cross-Cutting: Notification Center

Not a pillar — a persistent overlay reachable from anywhere via a badge in the nav.

**Primary question:** "What just happened that I asked to be told about?"

**Layout:** A slide-in panel (desktop: anchored dropdown; mobile: full-width sheet) listing triggered alerts, most recent first.

**Primary CTA:** Tap a notification to jump directly to the symbol/screen it concerns, with the Wow Moment highlight ring.

**Secondary actions:** Mark as read, clear.

**Empty state:** Plainly states no notifications yet and points at Workspaces as where alerts get created.

**Mobile/Desktop:** Already specified in `PRODUCT_EXPERIENCE_BLUEPRINT.md`'s wow-moment table; layout differs only in anchoring, never in content or hierarchy.

---

## Onboarding & First Launch

**Primary question:** "What is this, and can I trust it before I've used it once?"

**Layout:** Full-screen, one question per step (existing proven pattern), preceded by the workspace-identity claim step and a single honest framing screen (per the journey map in `PRODUCT_EXPERIENCE_BLUEPRINT.md`).

**Primary CTA:** "Continue" per step; final step lands directly on Today.

**Secondary actions:** "Skip" per step (only age and horizon are required, matching existing product behavior).

**Empty/Loading/Error:** A branded loading state (not a blank screen) while the initial profile check resolves; a step's submission failure keeps all prior answers intact and states the specific problem, never resets the flow.

**Mobile/Desktop:** Identical structure both ways — this flow is deliberately platform-agnostic, since a user's first launch is equally likely to be either.
