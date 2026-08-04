# PRIVATE_BETA_READINESS.md

**Phase X5 — Executive Product Audit**
**Scope:** whether the product is ready for even the smallest private beta today.

---

## The Gating Fact

The product does not currently load — confirmed this session via a genuinely fresh browser context (twice, including a brand-new page), producing a blank white screen caused by a JavaScript module error (`Header.jsx` importing a named export, `BETA_USER_LABEL_STORAGE_KEY`, that no longer exists in `BetaInviteGate.jsx`). No private beta of any size can begin while this is true — this is not a readiness *gap*, it is the total absence of a usable product to invite anyone into.

## Readiness Against Everything Reviewed in Prior Sessions

Setting the crash aside to assess what would need to be true once it's fixed (based on the immediately preceding session's live findings, since this session cannot re-verify them):

1. **Identity/invite flow** — A real fix for the previously-diagnosed invite-gate bug (the gate could never render because it was conditioned on a global, not per-user, fact) appears to have been attempted this session — `AppRoot.jsx` now has a `useBetaIdentity()` hook with real `CHECKING`/`RECOVERING`/`EXPIRED`/`INVALID` states, a genuine improvement in design over the prior session's dead-end condition. **This cannot be verified as actually working, because the fix itself introduced the crash that currently blocks all testing** — a real, direct causal link between this session's identity-flow work and the app's current total failure.
2. **Decision Center / Notification Center / Watchlist Folders** — Last verified as correctly enforcing (not bypassing) an identity requirement, but unreachable by any real user because no identity could be obtained. Whether the new identity flow resolves this is unverifiable today.
3. **No logout/switch-identity control** — confirmed absent in the prior session; still unconfirmed either way today.
4. **Single shared account architecture** — the deepest structural gap, confirmed repeatedly across many sessions (`Portfolio`/`InvestorProfile` singletons). Whatever identity work has been attempted this session, it has not yet been demonstrated to solve this at the data layer, only at the gate/UI layer.

## What "Ready" Would Require

1. The product must load, in a genuinely fresh browser, without error — the literal floor for any beta of any size.
2. A real, working invite flow, verified end-to-end (not just architecturally sound in source) for at least two independently-identified sessions.
3. Confirmation that two separately-identified users do not see or affect each other's portfolio, watchlist, or profile data.
4. A visible way to log out or switch identity, since this hasn't existed at any point across this engagement's testing.

## Verdict for This Specific Document

**Not ready.** Not narrowly — completely. A product that cannot be opened has not yet reached the starting line for a private beta of any size, regardless of how much real, good work exists underneath the current crash.
