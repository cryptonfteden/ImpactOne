# Security Incident Report — SECURITY-INCIDENT-CLOSURE-001

**Branch:** `sprint-16-live-data` · **Date:** 2026-08-02

## Mission

Close the exposed-secret incident (first identified during `GITHUB-BACKUP-AND-DEPLOYMENT-001`) before any production deployment proceeds. No deployment, no features, no redesign this phase — incident closure only.

## Incident Summary

A real `FINNHUB_API_KEY` and a real `OPENAI_API_KEY` were committed to `frontend/.env` in this branch's earliest history (`7676e23` "Sprint 1", `5d855ea` "Sprint 2"). The file was later removed from tracking (`c51048c`), but by the time this was discovered (during the prior phase's repository safety audit), that history was already the tip of the pushed `origin/sprint-16-live-data` branch — meaning the exposure was already live on GitHub before this incident was known, not something any local action created.

**Founder decision already made** (during the prior phase, before this one began): rotate the keys rather than rewrite git history and force-push. This phase respects and does not revisit that decision — no history rewrite, no force-push was performed here either.

## What This Phase Found (New, Beyond the Prior Phase's Disclosure)

1. **Live-validity check, not previously done**: a direct, minimal API call to each provider (never printing the key values — only shell-variable dereference, results reported as HTTP status codes only) found:
   - `FINNHUB_API_KEY`: **still valid and active** (`200 OK`) — the single most urgent fact this phase surfaced. This key remains usable by anyone who has seen the exposed history.
   - `OPENAI_API_KEY`: **already invalid** (`401 Unauthorized`) — lower urgency, but still requires formal rotation for hygiene.
2. **A second, current-tree exposure found and fixed**: `REMOTE_BACKUP_AUDIT.md` (an untracked file from other, unrelated concurrent audit work — never committed anywhere) quoted the real `FINNHUB_API_KEY` value in plain text as evidence. Redacted this phase; since the file was never tracked, this fix touched no git history.
3. **Full-history sweep, all credential types**: confirmed no other secret (`JWT_SECRET`, `ADMIN_API_KEY`, `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`, other data-provider keys, real database credentials, PEM keys, AWS-style keys) was ever committed with a real value anywhere in the full 281-commit reachable history — every other instance is an empty or placeholder assignment.
4. **Repository visibility**: independently confirmed (via an unauthenticated fetch to the repo's GitHub page returning `404`, consistent with private-repo behavior, combined with this environment's own configured git credentials successfully pushing/fetching) that the repository is very likely **private** — not confirmed public-internet-readable. This narrows (but does not eliminate) the incident's blast radius: the exposure remains real for anyone with legitimate repository access.
5. **Branch protection / collaborator list**: **not observable in this environment** — no `gh` CLI and no GitHub API token are available here. Disclosed as a real gap rather than guessed at.

## Remediation Performed This Phase

- **Current-tree scan**: confirmed clean — no real secret value exists in any tracked file today, and `.env` is correctly gitignored. Nothing needed "replacing with a placeholder" in the tracked tree, since it was already free of real values (the one found instance was an untracked file, now redacted).
- **CI secret scanning added**: `.github/workflows/ci.yml` gained a `secret-scan` job (`gitleaks/gitleaks-action@v2`, full history scan on every push/PR), with `.gitleaks.toml` allowlisting exactly the two already-disclosed historical commits by their real, full commit hash.
- **Pre-commit secret detection added**: `.githooks/pre-commit`, a dependency-free git-native hook scanning staged content for secret-shaped patterns, tested directly (passes clean content, blocks a deliberately fake secret) and documented as an opt-in (`git config core.hooksPath .githooks`) rather than silently forced on every clone.

## What Remains Open (Operator-Only Actions)

- **Rotate `FINNHUB_API_KEY` and `OPENAI_API_KEY`** at their respective provider dashboards — see `KEY_ROTATION_RUNBOOK.md` for exact steps and every location the new values must go.
- **Confirm branch protection and collaborator access** on GitHub directly (this environment cannot observe either) — recommended given the confirmed-still-active key finding: restrict push access to the intended owner(s) only, and consider requiring PR review before merge to `sprint-16-live-data`/`main` going forward.

## Verification

See `SECURITY_CLOSURE_CHECKLIST.md` for the full, itemized verification (backend/frontend suites, production build, clean-clone startup, secret scan results) and the mission's required final summary fields.

## Final Verdict

**CLOSED PENDING OPERATOR ROTATION** — every action this environment can take (identification, current-tree remediation, CI/pre-commit scanning, exact rotation instructions) is complete and verified. The incident cannot be marked fully `CLOSED` until the operator performs the real, external rotation of the still-active `FINNHUB_API_KEY` (and, for hygiene, the already-dead `OPENAI_API_KEY`) at the provider dashboards — an action no environment without provider-account access can perform on the operator's behalf. See `SECURITY_CLOSURE_CHECKLIST.md`'s Final Summary for every required field.
