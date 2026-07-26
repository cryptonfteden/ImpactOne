// Phase AI-ENGINE-003 — Platform Intelligence Bus. Freshness, expiry,
// and lifecycle status (INTELLIGENCE_BUS_ARCHITECTURE.md §6). Every
// function here is pure and deterministic given an explicit `now` — no
// hidden wall-clock reads.
const { staleAfterMsForEngine } = require("./intelligenceBusRegistry");

/**
 * The real, engine-appropriate expiry horizon for one event — an
 * options sweep signal and a weekly short-interest reading are not
 * stale on the same clock, so this is per-engine (registry-declared),
 * never one arbitrary global TTL.
 */
function computeExpiry({ engineId, publishedAt, explicitExpiresAt }) {
  if (explicitExpiresAt) {
    return explicitExpiresAt instanceof Date ? explicitExpiresAt : new Date(explicitExpiresAt);
  }
  const published = publishedAt instanceof Date ? publishedAt : new Date(publishedAt);
  return new Date(published.getTime() + staleAfterMsForEngine(engineId));
}

function computeFreshness({ publishedAt, now = new Date() }) {
  const published = publishedAt instanceof Date ? publishedAt : new Date(publishedAt);
  if (Number.isNaN(published.getTime())) {
    return { ageMs: null, isFresh: false };
  }
  return { ageMs: now.getTime() - published.getTime(), isFresh: true, asOf: published.toISOString() };
}

/**
 * Recomputes the honest lifecycle status of a persisted event AT READ
 * TIME — expiry is a function of `now`, never a value that could go
 * stale itself by being computed once and cached forever. A
 * `SUPERSEDED` status (persisted, since it's a real historical fact
 * about a specific newer event replacing this one) always wins over a
 * time-based EXPIRED recomputation — being superseded is a stronger,
 * more specific fact than merely being old.
 */
function resolveLifecycleStatus({ persistedStatus, expiresAt, now = new Date() }) {
  if (persistedStatus === "SUPERSEDED") return "SUPERSEDED";
  if (expiresAt && now.getTime() > new Date(expiresAt).getTime()) return "EXPIRED";
  return "ACTIVE";
}

module.exports = { computeExpiry, computeFreshness, resolveLifecycleStatus };
