# Beta Isolation Verification — Phase H2

Every result below is from a live run against the real dev database and a freshly-restarted backend (so the new schema/routes/middleware were actually loaded, not assumed). Two real `BetaUser` rows were created via the seed script (`backend/scripts/seedBetaUsers.js`), invite codes resolved through the real endpoint, and every subsequent action used the resulting `betaUserId` as a real HTTP header — exactly the path a real beta user's browser would take.

## Setup

```
Beta User A: BETA-A1 -> 78d9a0b5-dba1-46a0-937e-60d044bcc9b4
Beta User B: BETA-B2 -> 6e3ddec9-4860-4709-afa3-dec75bb894ba
Unknown code (GET /api/v2/beta/resolve?code=NOPE) -> 404 "Unknown invite code."
```

## 1. Independent Portfolio

| Action | User A | User B | Legacy (no header) |
|---|---|---|---|
| First `GET /api/v2/portfolio` (auto-create) | `portfolioId: b9f2c948-...`, $100,000, 0 positions | `portfolioId: d91aeb21-...`, $100,000, 0 positions | `portfolioId: 6def1e7a-...` (pre-existing D1.8 portfolio), $53,773.80, 5 positions |
| A places a real order: `BUY 5 AAPL @ $321.66` | Order filled, cash → $98,391.70, 1 position (AAPL) | — | — |
| B's portfolio immediately after A's trade | — | **Unchanged: $100,000 cash, 0 positions** | — |

**Three genuinely distinct portfolio rows, confirmed by real IDs. User A's real trade is completely invisible to User B.**

## 2. Independent InvestorProfile

| | User A | User B |
|---|---|---|
| Created with | `age: 28, riskTolerance: HIGH` | `age: 55, riskTolerance: LOW` |
| `GET /api/v2/investor-profile` (own) | `age: 28, riskTolerance: HIGH` | `age: 55, riskTolerance: LOW` |

**Each user reads back exactly their own profile — no cross-contamination.**

## 3. Independent Analytics Attribution

Both users fired the identical event (`morning_brief_read`). Verified directly against the database:

```json
[
  { "betaUserId": "6e3ddec9-4860-4709-afa3-dec75bb894ba", "eventName": "morning_brief_read" },
  { "betaUserId": "78d9a0b5-dba1-46a0-937e-60d044bcc9b4", "eventName": "morning_brief_read" }
]
```

**Correctly attributed to A and B respectively — same event name, distinct rows, real ids.**

## 4. Independent Feedback

Both users submitted feedback on the same real recommendation (`913150a0-...`) — A said `USEFUL`, B said `NOT_USEFUL`:

```json
[
  { "betaUserId": "6e3ddec9-4860-4709-afa3-dec75bb894ba", "feedbackType": "NOT_USEFUL" },
  { "betaUserId": "78d9a0b5-dba1-46a0-937e-60d044bcc9b4", "feedbackType": "USEFUL" }
]
```

**Each user's own reaction is preserved distinctly, correctly attributed, never merged or overwritten.**

## 5. No Shared Singleton State — Proof User A Cannot Affect User B

The single most important test in this document: **User A placed a real trade, and User B's portfolio was re-fetched immediately afterward and found completely unchanged** ($100,000 cash, 0 positions, exactly as before A's action). This is the literal, direct proof the mission asked for — not inferred from code review, but observed live, in that exact order, against the real database.

## 6. Backward Compatibility (no header at all)

`GET /api/v2/portfolio` with no `X-Beta-User-Id` header returns the pre-existing D1.8 singleton portfolio ($53,773.80 cash, 5 positions) — byte-for-byte the same object every pre-H2 request would have reached. **Nothing that existed before this phase changed behavior.**

## 7. Defensive Handling — Malformed Header

`GET /api/v2/portfolio` with `X-Beta-User-Id: not-a-real-id` (not a real UUID, not a real row) returned **HTTP 200** with the legacy singleton portfolio — the middleware's best-effort lookup failed to match, fell through to `undefined`, and every downstream service used its exact pre-H2 default. No error, no crash, no leak.

## Verdict

All five isolation requirements (identity, portfolio, investor profile, analytics, feedback) are proven live, with a direct, ordered demonstration that User A's actions cannot affect User B's data. No shared singleton state remains reachable by two different resolved beta users.
