# Navigation Consolidation — RC1-BLOCKERS-001

## 1. Watchlist Destination Duplication

**Every watchlist-related destination identified:**

| Destination | Screen key | Where reachable | Real state |
|---|---|---|---|
| "Workspaces" | `Watchlist Folders` | Sidebar Primary | Canonical — real, backend-persisted (Phase X3/X4: pin/alerts/impact summary). |
| "Watchlist Workspace" | `Watchlist Workspace` | Sidebar Advanced | A distinct, real Advanced-tier tool (not a duplicate of Workspaces — different feature, already correctly tiered). |
| "Watchlist" (legacy) | `Watchlist` | **Was**: `InvestorProfileScreen.jsx`'s Profile "More" section | Deprecated by Sidebar.jsx's own prior comment ("dropped as a nav destination... Watchlist Folders is the real, backend-persisted replacement") — but this one link was never updated to match, leaving a live, reachable dead end. |

**The real bug found**: `Sidebar.jsx` already correctly dropped the legacy `Watchlist` screen from desktop nav (with its own comment explaining why), but `InvestorProfileScreen.jsx`'s `MORE_DESTINATIONS` array — the equivalent mobile/Profile-page nav list — still pointed at it. This is exactly the "beta user identity required, 400 response, dead end" destination `FOUNDER_WEEK_REVIEW.md` found live.

**Fix**: `MORE_DESTINATIONS` in `InvestorProfileScreen.jsx` now points at `Watchlist Folders` — the same canonical destination Sidebar.jsx already uses. Nothing was deleted: the underlying `WatchlistScreen.jsx`/`Watchlist` screenMap entry is untouched and still passes its own tests (same "unreachable, not deleted" precedent already established in this codebase for this exact screen and for Sprint 40's Dashboard removal).

**Guest vs. authenticated behavior**: unaffected by this fix and already honest — `Watchlist Folders` genuinely requires a beta user identity and returns a real, disclosed error for a Guest session (not a silent failure); `Watchlist Workspace` genuinely works with an honest empty state for the same Guest session. This fix removes the confusing *third* path; it does not change either remaining path's real behavior.

## 2. Flagship vs. 3D Workspace Duplication

**Investigated both implementations directly, not just their visual shell:**

- **`FlagshipScreen.jsx`** (`features/flagshipScreen/`): a fixed, purpose-built set of 10 mission-required intelligence panels (portfolio health, breaking news, AI recommendations, etc.), each with its own custom panel content, plus a world-state engine, shockwave animations, and Earth-to-holding connection lines. Its own comments describe it as "the single flagship screen" and confirm it **already reuses** 3D Workspace's own Earth/CameraRig/OrbitalNode primitives rather than duplicating them.
- **`Workspace3DFeature.jsx`** (`features/workspace3d/`): a much smaller (58-line) component with a different real purpose — a 3D-themed **portal to existing screens**. Clicking its "Mission Control" toolbar button, or any orbital module, opens that module's real, unchanged, already-existing screen component (`MissionControlHomeFeature`, `PortfolioWorkspaceFeature`, `NewsIntelligenceFeature`, etc. — all independently reachable from Sidebar's own Advanced tier) inside a glass panel over the same 3D scene.

**Determination**: neither is a byte-for-byte duplicate of the other's code, but from a real user's perspective (per the live `FOUNDER_WEEK_REVIEW.md` finding) both present as the same shell with no visible explanation of why two exist — "the only observed difference [was] a single toolbar button label." Workspace3DFeature's real, distinct value (a 3D portal to Advanced-tier screens) is itself an Advanced-tier concern, not a Primary/daily one, while Flagship is explicitly the mission's designated single flagship destination and the one that already builds on Workspace3D's own primitives.

**Fix**: `3D Workspace` demoted from Sidebar's Primary tier to its Advanced tier — leaving **Flagship as the sole Primary/co-equal 3D entry point**, with 3D Workspace still fully reachable (not deleted, not hidden) alongside the individual Advanced screens it portals into. This mirrors the exact "unreachable-from-Primary, not removed" precedent Sidebar.jsx's own comments already establish for the legacy Watchlist screen and Sprint 40's Dashboard removal — a pattern, not a new one invented for this fix.

**Real functionality preserved**: every module Workspace3DFeature portals to remains independently reachable from Advanced (unchanged); Workspace3DFeature itself remains fully functional and in the screenMap, just no longer competing with Flagship for equal Primary billing.

## What Was Not Touched

- No screen's internal UI/UX was redesigned — only nav-list membership changed (which tier an entry lives in, and which screen key one link points to).
- No component was deleted.
- `BottomNav.jsx` (mobile) was checked and contains neither "3D Workspace" nor "Flagship" — no mobile nav change was needed.

## Verification

Both `InvestorProfileScreen.test.jsx` (5/5) and the frontend full regression suite (see commit message for the exact count) pass with these changes — no test in this codebase pinned the specific destination list contents this fix changed.
