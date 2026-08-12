# 16 — Security

## Verified controls

- Global security-header middleware.
- Global rate limiter and 1 MB JSON cap.
- Configurable CORS allow-list.
- Request logging and centralized errors.
- bcrypt password hashing, signed JWTs, server-side hashed session records and revocation.
- API-key middleware for the admin dashboard.
- Stripe webhook secret configuration.
- CI secret scanning through Gitleaks plus a repository rules file.
- Fail-fast production validation for required configuration.

## Required production configuration

Strong unique `JWT_SECRET` and `ADMIN_API_KEY`; restricted `CORS_ALLOWED_ORIGINS`; protected database and Redis URLs; provider keys; Stripe secrets only if Stripe is enabled; `NODE_ENV=production`; HTTPS at the hosting edge.

## Risks and gaps

- Empty admin key and allow-all CORS are development defaults and unsafe if production validation misses them.
- Route authorization is selective, not globally enforced. Conduct an endpoint-by-endpoint authorization matrix.
- Beta invite identity is not authentication and must not protect sensitive commercial data.
- No evidence of CSRF strategy, dependency vulnerability scanning, SAST, database row-level security, key rotation workflow, or penetration testing in active CI.
- Public repository history should be rescanned because the archive contains extensive generated artifacts and dependency trees.
- Logs and error reports must redact tokens, credentials, personal data, and provider payloads.

## Financial/privacy controls needed

Explicit retention/deletion policy, account export/deletion, consent for personalization/analytics, least-privilege operator roles, incident response ownership, and jurisdiction-specific investment-risk disclosures.
