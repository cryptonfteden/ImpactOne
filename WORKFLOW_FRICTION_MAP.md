# WORKFLOW_FRICTION_MAP.md — Phase FOUNDER-WEEK-AUDIT-001

Every specific friction point found this week, mapped to its workflow, with a concrete severity (reusing this engagement's own established `BUG_SEVERITY_STANDARD.md` scale so this map is directly comparable to every other audit in this repo's history, not a new one-off scale).

---

## Unnecessary clicks

| Workflow | Finding | Severity |
|---|---|---|
| AI Analysis, Recommendations, Daily Feed, Themes, Alerts | All 5 require expanding "More tools" first (1 extra click) before the target screen is even visible in the list, every single visit — no "recently used" or "pinned" shortcut exists for a founder's actual daily-use subset. | Medium |
| Watchlist | A founder must guess between 3 destinations ("Workspaces," "Watchlist Workspace," Profile's "Watchlist" link) with no in-app explanation of the difference — effectively an extra "which one is right?" decision on every visit until memorized. | High |
| Themes | Every one of the 7 theme cards requires its own click to reveal any information at all — there is no lower-cost way to see "what changed this week" across all 7 without opening each individually. | Medium |

## Repeated actions / repeated content

| Workflow | Finding | Severity |
|---|---|---|
| Daily Feed | "AAPL earnings" and "Earnings calendar concentration" — Importance, Confidence, Horizon, read-time, affected-holdings list, and Attention score are all byte-identical across the two distinct headlines. | Critical (per `BUG_SEVERITY_STANDARD.md`'s own definition: "a specific, checkable false [or indistinguishable] claim about the user's own data") |
| Alerts | "Fed rate hike" and "FOMC Rate Decision" share identical explanation text and identical Confidence 81/100 — the same underlying pattern as Daily Feed, confirmed on a second, independent screen. | Critical |
| Recommendations | 3 of 4 active recommendations (GOOGL, NVDA, MSFT) share identical "Would prove it wrong"/"What would change my mind"/"Watch next" text and near-identical confidence/upside/downside/size. | Critical |
| Themes (single-theme detail) | The exact same sentence is printed 3 times within one theme's own expanded view (summary, "Why," Supporting Evidence). | Medium |
| Home | "Today For You"'s first two items share the identical justification "You hold a position this directly affects" with no differentiation. | Medium |

## Confusing labels

| Workflow | Finding | Severity |
|---|---|---|
| Watchlist | Three separate nav destinations use overlapping names ("Workspaces," "Watchlist Workspace," "Watchlist") for what a founder would reasonably assume is one feature. | High |
| Navigation (Flagship / 3D Workspace) | Two separate sidebar entries lead to a structurally identical experience differing only in a single toolbar button's label ("Mission Chain" vs. "Mission Control") — the two names for the *feature* are close enough to also be confused with each other. | Medium |
| Decision Center (encountered incidentally, not one of the 12 named workflows) | Shows "Couldn't load... this is usually temporary — a slow connection or a brief server hiccup" simultaneously with "No decisions need your attention right now" — two contradictory messages on screen at once, and the "temporary" framing is inaccurate for what is actually a persistent identity-gating condition for this account. | High (noted for completeness; not scored into the 12-workflow review since Decision Center isn't one of the named 12) |

## Screens that slow the workflow

| Workflow | Finding | Severity |
|---|---|---|
| AI Analysis | 9 independently-scored sections with no reading-order guidance or synthesized bottom line — a founder must read and mentally reconcile all 9 every time. | Medium |
| Home | A single continuously-scrolling page holding 7 distinct sections (Morning Brief detail, Recommendations, Portfolio, Today For You, Intelligence Timeline, What Changed, Active Alerts) — efficient at the very top, but slow to get through in full. | Low (the top-of-page summary already mitigates most of this) |
| Themes | Zero preview information on the card grid forces a click-and-wait cycle per theme just to triage which ones changed. | Medium |

## Places where the founder would naturally expect automation

See `AUTOMATION_OPPORTUNITIES.md` for the full list; summarized here for completeness:

- A "what's new since I last looked" indicator on the Themes grid (the data already exists per-theme via "Theme Evolution," just not surfaced at the grid level).
- A badge/count on the sidebar for new Recommendations since last visit (the engine already runs on a fixed 30-minute interval — the founder still has to remember to check).
- Deduplication between Daily Feed and Alerts when the same underlying event (e.g., "Fed rate hike") appears identically on both.
- A persisted "always show full reasoning" preference for Recommendations/AI Analysis instead of re-clicking "Show full evidence"/"View full reasoning" every day.

## What could NOT be fully verified this session (disclosed, not glossed over)

- Flagship's actual rendered visual appearance — the screenshot tool returned a stale image of Home instead of the live Flagship canvas twice in a row, despite DOM-level confirmation that Flagship was genuinely active (a real `<canvas>` element and the correct toolbar button present). Treated as a tooling limitation this session, not a product finding, and not used to make any visual claim.
- Whether the Watchlist-Folders/Decision-Center identity-gated failures reproduce identically for an account with an active invite code — this review used the default Guest session deliberately (the realistic "just opened the app" scenario), and the findings above are scoped to that state.
