# FIRST_TIME_USER_REVIEW.md

**Phase X4 — First-Time User Validation**
**Persona:** a real beta user receiving an invite for the first time.
**Method:** live testing only, including a full backend restart (to rule out stale-process artifacts, a lesson from the prior review) and a genuinely cleared browser state (`localStorage.clear()` + fresh navigation) to simulate a real first-time visit.

---

## Invite Flow — Broken, With a Precisely Diagnosed Root Cause

This is the headline finding of this entire review. A `BetaInviteGate.jsx` component now exists and is wired into `AppRoot.jsx`. Testing it as a genuine first-time visitor (cleared `localStorage`, fresh page load) should have shown it. **It did not appear at all** — the app loaded directly into the last-viewed screen with a fully populated account, as if returning, not new.

Reading `AppRoot.jsx` directly explains why: the gate only renders when `!hasProfile && !betaGateDone`. `hasProfile` comes from `useInvestorProfile()`, whose own file comment states plainly: *"the InvestorProfile singleton lives server-side."* Because a shared `InvestorProfile` row already exists on this backend from months of prior testing, `hasProfile` is `true` for **every** browser that connects — cleared storage or not — so the condition `!hasProfile` is never true again, and `BetaInviteGate` can never render for anyone. This is not a flaky bug; it is a deterministic, always-reproducible logic error: **the invite gate is conditioned on a global, shared fact (does any profile exist anywhere) instead of a per-user fact (does this specific visitor have an identity yet)** — the exact same class of problem this multi-session isolation effort has been trying to close.

**Practical consequence:** a real second beta user, receiving a real invite link today, would never see an invite screen at all. They would land directly inside an account that already has someone else's trades, watchlist, and profile — with no indication anything is shared.

## Identity Creation

Not reachable, for the reason above. `betaUserController.js`/`betaUserRepository.js`/`betaUserContext.js` exist server-side, but the one client-side entry point designed to create an identity (`BetaInviteGate.jsx`) is unreachable code today given the current gating condition.

## Session Persistence

Could not be meaningfully tested without a real identity to persist — the existing session (the shared account) does persist correctly across reloads, but that is the pre-existing single-account behavior, not evidence of the new per-user session design working.

## Decision Center

Reachable as a screen; its data call correctly enforces the beta-identity requirement (400, "A beta user identity is required for the Decision Center") — architecturally consistent, practically unusable, since no identity can be obtained. The screen still shows a contradictory "No decisions need your attention right now" message alongside the error (a repeat of a defect found in the prior review).

## Notification Center

Same pattern: correctly enforces identity (400, "A beta user identity is required for notifications"), unreachable for the same underlying reason.

## Impact Graph

**Genuinely good, and honestly built.** Reached via the Stock Side Panel (no identity requirement blocks it). For AAPL, it displayed: *"Events exist, but no causal chain yet — AAPL has 128 recorded event(s) but no causal links between them yet — the chain is genuinely unknown, not fabricated."* This is exactly the right behavior for a feature whose underlying data genuinely doesn't exist yet — no fake nodes, no invented relationships, a clear, honest state. Full detail in `IMPACT_GRAPH_UX_REVIEW.md`.

## Workspace Navigation

Watchlist Folders (the practical "Workspace" screen) is reachable but blocked by the same identity requirement as Decision Center — folder creation, symbol assignment, and workspace detail (which per the backend completion report includes Notes/Timeline/Health/Decisions/Impact Graph tabs) could not be tested as an actual identified user.

## Chart Interactions

Confirmed working again this session, consistent with the prior review: real pan, zoom, hover tooltip, and timeframe switching, reached via the Side Panel. This remains one of the product's genuinely strong, functioning new capabilities.

## Side Panel

The single best-functioning new surface tested this session. Opens in place (no navigation), bundles Overview/Chart/AI Summary/Portfolio Impact/Latest News/Opportunity Score/Market Positioning/Impact Graph/Alerts/Workspace Membership into one coherent view of a symbol — genuinely useful, and every section that lacked data said so honestly rather than hiding or faking it (Alerts: "No alerts set on this symbol yet"; Workspace Membership: "Not tracked in any workspace folder yet").

---

## Try to Break — Results

- **Invalid invite / Expired invite:** not testable — the invite entry screen itself cannot currently be reached by any user (see Invite Flow above).
- **Session restore:** the existing shared session restores correctly, but this reflects old single-account behavior, not the new per-user design.
- **Logout:** no logout control was found anywhere (Account menu still shows only "Guest workspace" + Settings).
- **Deep links:** not tested this session (out of time budget) given the more fundamental invite-flow blocker found first.
- **Protected pages:** Decision Center, Watchlist Folders, and Notifications all correctly reject requests without a valid identity (400, clear message) — the protection itself works correctly; only the provisioning step is missing.
- **Notification navigation:** not reachable — Notification Center cannot load without an identity.
- **Decision actions:** not reachable — Decision Center cannot load without an identity.
- **Impact Graph interactions:** the graph's own empty/honest state was reached and read correctly; no interactive expand/traverse behavior could be tested since AAPL has zero real causal links to interact with.

---

## Judged Against the Five Questions

**Can a first-time user reach value in under 60 seconds?** For the pre-existing product (Home, Recommendations, Portfolio): yes, largely unchanged from prior reviews. For every feature this session was specifically asked to validate (Decision Center, Notifications, Workspace navigation): no — these are entirely unreachable today.

**Does every screen answer exactly one question?** The Side Panel does this well for "what do I need to know about this symbol." Decision Center's premise is a clean single question ("what needs my attention") but can't be evaluated since it can't be used.

**Does it feel unique?** The Side Panel's bundle (chart + AI summary + opportunity score + market positioning + impact graph + portfolio impact, all in one place) is a genuinely distinctive assembly. This is real progress on product identity.

**Does it still resemble TradingView too much?** The chart interaction model (pan/zoom/crosshair/timeframes) intentionally matches TradingView's baseline — correctly so, since that's the expected minimum, not a differentiator. The surrounding bundle around the chart is where the product's own identity now genuinely shows.

**Would you recommend this product to another active investor today?** No. Not because the ideas are weak — several are genuinely good — but because the actual mechanism for a second real person to get their own identity and use the product safely is provably broken, and that is the single most basic requirement for recommending a multi-user beta to anyone.
