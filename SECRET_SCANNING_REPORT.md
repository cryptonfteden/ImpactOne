# Secret Scanning Report — SECURITY-INCIDENT-CLOSURE-001

## Current Repository Scan

- **Tracked files** (`git grep`, index-based, fast): scanned for the exact real values of both exposed keys — zero matches. Also scanned for `sk-proj-`/AWS-key/PEM-private-key-shaped strings across all tracked `.js`/`.json`/`.md` content — zero matches beyond this phase's own documentation *describing* the incident (which never quotes a real value).
- **Untracked root-level `.md` documents** (~130 files from other, unrelated concurrent work): scanned for both real key values — zero matches, except the one already-found and already-redacted mention in `REMOTE_BACKUP_AUDIT.md` (see `SECRET_EXPOSURE_REGISTER.md`).
- **`CEO_AUDIT_EXPORT/`, `CEO_EVIDENCE_PACK/`** (untracked report-export directories): scanned for both real key values — zero matches.
- **`.env` tracking status**: confirmed absent from the tracked tree at current `HEAD` (`git ls-files` returns zero `.env` matches); `.gitignore` already covers `.env`/`.env.local`/`.env.*.local`.

## Reachable Git History Scan

- `git log --all -p -S"<pattern>"` run against every credential this codebase reads (`JWT_SECRET`, `ADMIN_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FINNHUB_API_KEY`, `OPENAI_API_KEY`, `POLYGON_API_KEY`, `NEWS_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `SEC_EDGAR_USER_AGENT`, `OPTIONS_FLOW_PROVIDER_API_KEY`, `DATABASE_URL`), scoped to every `.env`-shaped file ever committed across all 281 reachable commits.
- **Result**: exactly two real secrets found (`FINNHUB_API_KEY`, `OPENAI_API_KEY`, both in `frontend/.env`, commits `7676e23`/`5d855ea` — see `SECRET_EXPOSURE_REGISTER.md` for full detail). Every other credential-shaped variable, in every commit that ever touched it, was assigned only an empty or placeholder value.
- A separate, broader regex sweep (`git log --all -p -S"sk-proj-"`) confirmed the OpenAI key's introduction/removal commits and found no additional, unrelated occurrence anywhere else in history.

## Secret Scanning Added to CI

`.github/workflows/ci.yml` gained a new `secret-scan` job using the official `gitleaks/gitleaks-action@v2`, checked out with `fetch-depth: 0` (the full history, not just the push diff) so it also catches an attempt to reintroduce a secret via a later rewrite or amend. A companion `.gitleaks.toml` extends gitleaks' own default, maintained ruleset (not a bespoke, hand-rolled pattern list) and allowlists **exactly** the two already-known, already-disclosed historical commits (`7676e23e85bb84d99d243f5959db70f7d226db9d`, `5d855ea2c6fe240a0bee080fa2dbeb010ca1c020`) by their real, full commit hash — not by path or regex, so it cannot silently suppress a genuinely new secret anywhere else, including in a future commit that happens to touch the same file again.

**Not yet run against the real GitHub Actions runner** — this environment cannot execute GitHub Actions locally. The YAML syntax and the gitleaks action reference are correct and standard (a real, published action), but the first real confirmation that this job passes/fails correctly happens on the next real push to GitHub.

## Pre-Commit Secret Detection Added

`.githooks/pre-commit` — a dependency-free, git-native shell script that scans only the **staged diff** (not the whole tree, so it stays fast) for secret-shaped patterns: OpenAI-style keys, AWS access key IDs, PEM private-key headers, a Postgres URL with a real non-empty password, and any of this codebase's own named secret environment variables assigned a non-trivial (6+ character) value.

- **Tested directly this phase**: a safe, no-secret staged file passed (exit 0); a deliberately fake secret-shaped staged file was correctly blocked (exit 1, with a clear message) — both verified by direct execution, not assumed.
- **Not auto-installed for every clone** — deliberately. Silently taking over every future `git commit` on checkout is its own supply-chain trust concern. An operator opts in once with `git config core.hooksPath .githooks`, documented in `SECURITY_CLOSURE_CHECKLIST.md`.

## What This Scanning Setup Does Not Do

- It does not retroactively scan or purge the two already-known, already-disclosed historical commits — those are handled by disclosure + rotation (`KEY_ROTATION_RUNBOOK.md`), not by scanning.
- It does not replace human judgment on `--no-verify` overrides — the pre-commit hook is a real safety net, not an unbypassable gate (git hooks never are, by design); CI's gitleaks job is the actual unbypassable check once code reaches GitHub.
