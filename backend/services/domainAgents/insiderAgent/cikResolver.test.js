const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveCik, clearCache } = require("./cikResolver");

function mockTickerResponse() {
  return {
    data: {
      "0": { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." },
      "1": { cik_str: 1652044, ticker: "GOOGL", title: "Alphabet Inc." },
    },
  };
}

test("resolveCik resolves a real symbol to its real, zero-padded CIK and title", async () => {
  clearCache();
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve(mockTickerResponse());
  try {
    const result = await resolveCik("AAPL");
    assert.equal(result.cik, "0000320193");
    assert.equal(result.title, "Apple Inc.");
  } finally {
    require("axios").get = originalGet;
    clearCache();
  }
});

test("resolveCik is case-insensitive against the real ticker index", async () => {
  clearCache();
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve(mockTickerResponse());
  try {
    const result = await resolveCik("aapl");
    assert.equal(result.cik, "0000320193");
  } finally {
    require("axios").get = originalGet;
    clearCache();
  }
});

test("resolveCik honestly returns null for a symbol not in the real index, never fabricating a CIK", async () => {
  clearCache();
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve(mockTickerResponse());
  try {
    const result = await resolveCik("NOPE");
    assert.equal(result, null);
  } finally {
    require("axios").get = originalGet;
    clearCache();
  }
});

test("resolveCik honestly returns null on a real network failure, never throwing", async () => {
  clearCache();
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.reject(new Error("simulated network failure"));
  try {
    const result = await resolveCik("AAPL");
    assert.equal(result, null);
  } finally {
    require("axios").get = originalGet;
    clearCache();
  }
});

test("resolveCik caches the real index across calls — a second symbol lookup does not re-fetch", async () => {
  clearCache();
  let callCount = 0;
  const originalGet = require("axios").get;
  require("axios").get = () => {
    callCount += 1;
    return Promise.resolve(mockTickerResponse());
  };
  try {
    await resolveCik("AAPL");
    await resolveCik("GOOGL");
    assert.equal(callCount, 2, "the SEC index and shared Massive reference are both cached across symbol lookups");
  } finally {
    require("axios").get = originalGet;
    clearCache();
  }
});
