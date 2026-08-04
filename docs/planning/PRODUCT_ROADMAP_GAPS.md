# Product Roadmap Gaps — Phase PRODUCT-AUDIT-001

Gaps only, organized by how foundational they are to the "AI Market Operating System" ambition, not by engineering effort. Each gap states what exists today, what's missing, and why it matters at the product level. No code, no implementation timeline — sequencing judgment only.

## Tier 0 — Trust integrity (must close before anything else compounds)

The product's entire differentiation thesis (`PRODUCT_ARCHITECTURE_AUDIT.md` §1) depends on the AI's stated reasoning matching reality. This is not a normal feature gap — every other gap in this document is worth less if this one keeps recurring.

- **Gap:** repeated, live-reproducible instances across this audit's own history of a surface's stated claim not matching real underlying data (false portfolio-overlap claims, templated explanations, committee-independence collapse, the just-found always-empty AI recommendations section). Each has been individually fixed when found; the *pattern* of recurrence has not been addressed.
- **Why it matters:** a product whose stated edge is "honest AI reasoning" cannot afford this pattern to be a recurring theme across review cycles — competitors without this claim don't carry this specific risk.
- **What would close it:** not named here (this document is gaps, not fixes) — but the pattern itself (test fixtures encoding assumed shapes rather than real API contracts) is worth naming as the recurring root cause, since it's shown up more than once.

## Tier 1 — Unify before the next screen ships

These are the cheapest gaps to close today and the most expensive to leave, because every new screen currently re-derives them independently.

- **Gap:** no single "is this held" / "is this relevant to the user" service. Three real screens (Portfolio Workspace, Decision Center, Side Panel) each independently re-derive "does this concern something the user owns," with at least one confirmed to be silently broken.
- **Gap:** no single "what deserves this user's attention right now" arbitration layer. Mission Control, Intelligence Workspace, Portfolio Workspace, and Decision Center each compute their own version of this from overlapping data.
- **Gap:** no single "everything the platform currently believes about this symbol" composed view. A user can encounter up to four independently-labeled opinions (Recommendation, Committee, Analyst Consensus, and soon Options Agent) about one symbol with nothing reconciling them into one place.
- **Gap:** three overlapping "Workspace"-branded screens exist with no stated relationship to each other or to the growing "More tools" nav group. Nothing currently prevents a fourth, fifth, or sixth workspace-shaped screen from being added the same way.
- **Why now, not later:** each of these gaps gets more expensive to close for every additional screen built against the un-unified version — the Portfolio Workspace bug is a direct, live example of the cost of waiting.

## Tier 2 — Make the already-built foundations real

Options Agent, Impact Graph, and Market Memory are architecturally sound and substantively tested, but currently deliver near-zero real user value.

- **Gap:** Options Agent Foundation has a real, tested backend (817/817 backend tests passing) but **no HTTP route, no scheduler, no vendor connection, and no frontend surface** — entirely unreachable by any user today.
- **Gap:** Impact Graph / Market Memory has real schema and real query logic but (per this audit's own prior data-layer findings) close to zero real causal-link data populated — the causal-reasoning story is honest (it says so rather than fabricating), but there is currently almost nothing to reason over.
- **Gap:** data breadth behind the whole intelligence layer is thin — the overwhelming majority of registered data providers have never produced real data.
- **Why it matters:** these are the specific capabilities that would make "AI Market Operating System" a true description rather than an aspiration — right now they are foundations, correctly built, waiting for the next phase.

## Tier 3 — Close the learning loop

- **Gap:** the platform observes and grades itself (Outcome, Calibration) but this data has never once fed back into scoring weights, source trust, or committee composition — by the code's own documentation, this connection is deliberately absent.
- **Why it matters:** this is the single gap that separates "a very well-instrumented intelligence terminal" from "a system that actually gets better over time" — the literal definition of the "operating system" ambition in the mission's own framing.

## Tier 4 — Operate continuously, not on request

- **Gap:** the platform is overwhelmingly pull-based — a user must open a screen to learn anything. Scheduled jobs exist (5–15 minute cron cycles) but nothing proactively reaches the user when something they hold crosses a real, meaningful threshold beyond basic price alerts.
- **Gap:** no real streaming/real-time data path anywhere in the platform — every surface is poll-and-refresh.
- **Why it matters:** "operating system" implies the system is doing something continuously on the user's behalf, not merely presenting a nicer view when asked.

## Tier 5 — Identity, access, and scale maturity

- **Gap:** real per-user data isolation now exists (a genuine, hard-won recent win), but there is no team/household/advisor-seat model, no roles/permissions, and no real authentication system — today's identity model is invite-code-based, appropriate for a small private beta, not for scaled operation.
- **Why it matters:** this gap doesn't block today's cohort size, but it blocks every monetization path in `PRODUCT_ARCHITECTURE_AUDIT.md` §6 that depends on seats, teams, or tiers.

## Tier 6 — Breadth and reach (deliberately last, not forgotten)

- **Gap:** equities-only in practice; no real cross-asset breadth (crypto/forex/fixed income exist only as thin surface mentions); no mobile-native app (PWA only); no backtesting/simulation environment (TradingView's core strength, absent here entirely).
- **Why this is intentionally last, not urgent:** per this product's own previously-established strategic positioning (financial-literacy-first, not a terminal), competing with Bloomberg/TradingView on raw breadth would dilute rather than strengthen the actual differentiation identified in §1 — this tier should stay deliberately low-priority unless the product's strategic positioning itself changes.
