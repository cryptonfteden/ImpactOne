# Secret Exposure Register — SECURITY-INCIDENT-CLOSURE-001

Every credential-shaped item found across the complete reachable git history (281 commits, all refs, `git log --all`), with exact evidence. No secret value is printed in this document — only its type, location, and validity status.

## Confirmed Exposures

| # | Secret type | Commit(s) | File path | Present in current tree? | Still valid? |
|---|---|---|---|---|---|
| 1 | `FINNHUB_API_KEY` | `7676e23` (added), `5d855ea` (retained) | `frontend/.env` | **No** — removed from tracking in `c51048c`. History-only. | **YES — confirmed live**, via a real, direct API call to Finnhub's `/quote` endpoint returning `200 OK`. This key is actively usable right now by anyone who has seen the exposed history. |
| 2 | `OPENAI_API_KEY` | `5d855ea` (added, alongside the Finnhub key) | `frontend/.env` | **No** — removed from tracking in `c51048c`. History-only. | **NO — confirmed invalid**, via a real, direct API call to `GET https://api.openai.com/v1/models` returning `401 Unauthorized`. Already revoked or expired independently of this incident. |

Both keys' validity was checked with a live, minimal API call (never a guess) — the exact key values were referenced only via shell-variable dereference sourced from the local `.env` file, never typed literally into any command or printed to any output; only the resulting HTTP status codes are recorded here.

## Everything Else Checked, With Zero Exposure Found

A full-history search (`git log --all -p -S"<key-name>="`, restricted to `.env`-shaped files) was run for every other credential this codebase reads:

| Secret type | Result |
|---|---|
| `JWT_SECRET` | Every commit that touches this key in any `.env*` file assigns it an empty placeholder (`JWT_SECRET=`). No real value ever committed. |
| `ADMIN_API_KEY` | Same — always an empty placeholder. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | No commit in history ever set a real `sk_`/`whsec_`-shaped value; always empty. |
| `POLYGON_API_KEY`, `NEWS_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `SEC_EDGAR_USER_AGENT`, `OPTIONS_FLOW_PROVIDER_API_KEY` | Always empty placeholders across every commit that touches them. |
| `DATABASE_URL` (any commit, any file) | Every occurrence uses a local/placeholder host (`127.0.0.1`, `localhost`) and a placeholder password (`CHANGE_ME` or Docker/CI-only `postgres:postgres`) — never a real, reachable production credential. |
| Any PEM private key header, AWS-style `AKIA` key, or other generic secret-shaped string | Zero matches anywhere in tracked history outside the two confirmed items above. |

## Current-Tree Findings (Working Directory, Not Yet Committed)

- **`REMOTE_BACKUP_AUDIT.md`** (untracked, from other concurrent session work, not committed anywhere) contained the real `FINNHUB_API_KEY` value in plain text, quoted as evidence in its own findings. **Redacted this phase** — the real value was replaced with a reference to this register; the file was never tracked, so no git history was affected by this fix.
- A comprehensive scan of the current working tree (tracked files via `git grep`, plus all root-level `.md` documents and the untracked `CEO_AUDIT_EXPORT`/`CEO_EVIDENCE_PACK` directories) for both real key values found **no other occurrence**, tracked or untracked.
- `.env` remains correctly excluded from tracking today (`git ls-files` returns zero matches for any `.env` path at current `HEAD`), and `.gitignore` already covers `.env`, `.env.local`, `.env.*.local`.

## Severity

Per the mission's own convention, a **still-valid, currently-active credential** (`FINNHUB_API_KEY`) sitting in reachable, pushed git history is a **Critical, must-rotate-now** finding — not contingent on repository visibility (private repos are still exposed to every collaborator, and history persists regardless of later deletion from the tracked tree). The `OPENAI_API_KEY` finding is real and still requires disclosure and registry, but its live risk is already neutralized (the key itself no longer authenticates).

See `KEY_ROTATION_RUNBOOK.md` for the exact operator steps to close this out.
