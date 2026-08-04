# MONTHLY_COST_ESTIMATE.md — Phase HOSTING-DECISION-001

All figures below are taken directly from each provider's current, live-fetched pricing pages this session (see `HOSTING_COMPARISON.md` for sources). Estimates are scoped to **1 founder, up to 5 total users** — no enterprise scaling.

## Primary architecture: Render

| Service | Tier | Monthly cost | Notes |
|---|---|---|---|
| Workspace plan | Hobby | $0 | Sufficient — 1 team seat, 2 custom domains included, 5GB bandwidth included/month (plenty for ≤5 users). |
| Frontend (Static Site) | — | $0 | Static sites are always free to deploy; only counts against the workspace's shared bandwidth pool. |
| Backend (Web Service) | Starter (512MB/0.5 CPU) | $7 | No idle sleep — required for the 4 continuous background schedulers. |
| PostgreSQL | Basic-256mb | $6 | Real, persistent, automatic PITR (3-day window on Hobby workspace). |
| Redis (optional) | *Skipped at launch* | $0 | App gracefully degrades without it (verified, existing behavior). |
| **Mandatory subtotal** | | **$13/month** | Frontend + Backend + Database only. |
| **If Redis is added later** | Key Value Starter (256MB, persistent) | +$10 | Optional, not required for launch. |
| **If more Postgres headroom is wanted** | Basic-1gb instead of Basic-256mb | $19 (instead of $6) | Optional upgrade, in-place resize. |

**Recommended real-world monthly cost: $13/month** (mandatory services only). **With optional Redis added: $23/month.**

## Fallback architecture: Railway

| Service | Tier | Estimated monthly cost | Notes |
|---|---|---|---|
| Plan | Hobby | $5 (includes $5 of usage credit) | Flat subscription; usage below $5/month of resource consumption is fully covered by this fee. |
| Backend usage (RAM+CPU, continuous) | ~0.5GB RAM average + minimal fractional vCPU for a low-traffic ≤5-user app | ~$5–$7 | RAM billed at $10/GB/month, CPU at $20/vCPU/month — a small always-on Express process at ~256–512MB averages roughly $2.50–$5/month in RAM alone, plus a small CPU component given genuinely low request volume at this scale. |
| PostgreSQL usage (RAM+CPU+volume, continuous) | Small instance (~256–512MB) + <1GB volume | ~$3–$5 | Same per-second billing model; volume storage at $0.15/GB/month is negligible for ≤5 users' data. |
| Frontend | Hosted on Render's free Static Site (reused) or Vercel Hobby | $0 | No purpose-built free static host on Railway itself — reuse a free option elsewhere rather than pay for general-purpose compute to serve static files. |
| Redis (optional) | *Skipped at launch* | $0 | Same reasoning as primary. |
| **Estimated subtotal** | | **≈ $8–$12/month** (beyond the $5 base, once real usage is measured) | This is a range, not a fixed SKU price, because Railway bills per-second actual consumption rather than a fixed instance tier — the true number can only be confirmed after a few days of real usage on the dashboard's usage view. |

**Recommended real-world monthly cost estimate: ~$10–$15/month total** (base subscription + measured usage), with the caveat that this is Railway's own usage-metered model and will only be exactly known once deployed.

## Cost of the Vercel + separate-backend option (evaluated, not selected)

| Service | Tier | Monthly cost | Notes |
|---|---|---|---|
| Frontend (Vercel) | Pro (Hobby is explicitly "personal, non-commercial use" per Vercel's own FAQ — not an honest fit for a monetizable founder product) | $20/user/month | For a solo founder, 1 seat = $20/month. |
| Backend + Postgres | Render (Starter $7 + Basic-256mb $6) or Railway (~$10–$15) | $13 or ~$10–$15 | Same as the primary/fallback backend costs above — Vercel cannot host the backend itself (see `HOSTING_COMPARISON.md`'s architecture-mismatch finding). |
| **Total** | | **$33/month (with Render backend) or ~$30–$35/month (with Railway backend)** | More expensive than the all-Render primary architecture, and split across 2 providers/2 bills — presented for completeness, not recommended. |

## Summary comparison

| Architecture | Monthly cost (mandatory only) | Providers/accounts | Automatic managed Postgres backups? |
|---|---|---|---|
| **Render (primary, recommended)** | **$13** | 1 | ✅ Yes (automatic PITR, 3-day window) |
| Railway (fallback) | ~$10–$15 | 1 (+ reuse a free static host) | ❌ No — manual setup required |
| Vercel + Render backend | $33 | 2 | ✅ Yes (via the Render half) |
| Vercel + Railway backend | ~$30–$35 | 2 | ❌ No |

The Render primary architecture is both the cheapest *and* the most operationally reliable (automatic managed backups) of every combination evaluated — not a tradeoff between cost and reliability, a genuine win on both axes for this specific, small-scale use case.
