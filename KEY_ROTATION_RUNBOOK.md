# Key Rotation Runbook — SECURITY-INCIDENT-CLOSURE-001

**No rotation has been performed by this phase.** This environment has no access to the OpenAI or Finnhub account dashboards — rotation is exclusively an operator action. Nothing below claims otherwise; every step is written as an instruction for the operator to execute, not a record of something already done.

## Why This Is Urgent (Recap)

`FINNHUB_API_KEY` (exposed in git history, commits `7676e23`/`5d855ea`) was confirmed **still live and usable right now** via a direct, real API check (`200 OK` from Finnhub's own `/quote` endpoint). `OPENAI_API_KEY` from the same exposure was confirmed **already invalid** (`401 Unauthorized`) — lower urgency, but still worth formally rotating/regenerating so a fresh, known-good key replaces an already-dead one in every config location.

## Step 1 — Revoke and Rotate at the Provider

### Finnhub (urgent — the exposed key is confirmed still active)

1. Log in to your Finnhub account dashboard (finnhub.io).
2. Navigate to your API key management page.
3. Revoke/delete the currently active key (the one matching what's in this repo's local `.env` files — do not paste it anywhere; you'll recognize it from your own dashboard listing).
4. Generate a new API key.
5. Do not commit the new key anywhere — see Step 2 for exactly where it goes instead.

### OpenAI (lower urgency — already invalid, but formalize the rotation)

1. Log in to the OpenAI platform dashboard (platform.openai.com).
2. Navigate to API keys.
3. If the old exposed key still appears in the list (even though it no longer authenticates), revoke/delete it explicitly rather than leaving a dead-but-listed key on the account.
4. Generate a new API key.

## Step 2 — Every Location the New Values Must Go

| Location | What to set | Notes |
|---|---|---|
| `backend/.env` (local dev machine) | New `FINNHUB_API_KEY` | This file is gitignored — editing it never touches git history. |
| `frontend/.env` (local dev machine) | New `FINNHUB_API_KEY`, new `OPENAI_API_KEY` | Same — gitignored, safe to edit directly. |
| Any real hosting platform's own environment-variable configuration (once a platform is chosen — see `PRODUCTION_DEPLOYMENT_RESULT.md` from the prior deployment phase) | New `FINNHUB_API_KEY`, new `OPENAI_API_KEY` | Set directly in the platform's own secret/env UI — never in a file that gets committed. |
| Any CI secret store (GitHub Actions repository secrets), **only if** a future CI job needs a real provider key (today's CI workflow does not call these providers — backend tests run with no configured provider keys and each provider degrades gracefully) | Not currently required | Documented here so it isn't missed if CI's scope ever expands to hit real provider APIs. |

## Step 3 — Confirm the Old Key Is Actually Dead

After rotating, the operator should re-run the same kind of live check this phase used to confirm the *old* Finnhub key's status (a single, minimal `GET` request to Finnhub's `/quote` endpoint using the **old**, revoked key) and confirm it now returns an authentication failure rather than `200 OK`. This closes the loop with direct evidence rather than assuming the dashboard's "revoked" state is reflected everywhere immediately.

## Step 4 — What This Phase Did *Not* Do, and Why

- **Did not rewrite git history** to remove the old `frontend/.env` commits — per explicit founder decision in the prior `GITHUB-BACKUP-AND-DEPLOYMENT-001` phase, rotation was chosen over a destructive history rewrite + force-push. That decision stands; this phase did not revisit it.
- **Did not rotate the keys itself** — this environment has no access to either provider's account. Every step above is a real, specific, operator-only action.

## Verification This Runbook's Instructions Are Accurate

The revocation/rotation UI descriptions above are standard, publicly documented dashboard flows for both providers as of this repository's own already-existing setup instructions (`ENVIRONMENT_SETUP.md` already documents both `FINNHUB_API_KEY` and `OPENAI_API_KEY` as real, provider-issued values with no safe default) — this runbook does not invent a new provisioning process, only sequences the existing one around the specific rotation this incident requires.
