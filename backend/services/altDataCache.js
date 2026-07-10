const cache = new Map();

function buildKey(scope, payload = "") {
  return `${scope}:${payload}`;
}

function getCached(scope, payload = "") {
  const key = buildKey(scope, payload);
  const item = cache.get(key);
  if (!item) {
    return null;
  }

  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }

  return item.value;
}

function setCached(scope, payload = "", value, ttlMs = 5 * 60 * 1000) {
  const key = buildKey(scope, payload);
  cache.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1000, Number(ttlMs || 0)),
  });
}

module.exports = { getCached, setCached };
