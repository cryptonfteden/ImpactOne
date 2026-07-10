const cache = new Map();

function key(scope, payload = "") {
  return `${scope}:${payload}`;
}

function get(scope, payload = "") {
  const item = cache.get(key(scope, payload));
  if (!item) {
    return null;
  }

  if (Date.now() > item.expiresAt) {
    cache.delete(key(scope, payload));
    return null;
  }

  return item.value;
}

function set(scope, payload = "", value, ttlMs = 10 * 60 * 1000) {
  cache.set(key(scope, payload), {
    value,
    expiresAt: Date.now() + Math.max(1000, Number(ttlMs || 0)),
  });
}

module.exports = { get, set };
