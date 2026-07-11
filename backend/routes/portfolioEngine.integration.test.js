require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const finnhubService = require("../services/finnhubService");
const app = require("../app");

function mockQuote(price) {
  return async (symbol) => ({
    quote: { symbol: String(symbol).toUpperCase(), price, change: 0 },
  });
}

async function withMockedQuote(price, run) {
  const original = finnhubService.getQuote;
  finnhubService.getQuote = mockQuote(price);
  try {
    return await run();
  } finally {
    finnhubService.getQuote = original;
  }
}

test.beforeEach(async () => {
  await truncateAll();
});

test("GET /api/v2/portfolio returns a fresh $100k portfolio", async () => {
  const response = await request(app).get("/api/v2/portfolio");
  assert.equal(response.status, 200);
  assert.equal(response.body.cashBalance, 100000);
  assert.deepEqual(response.body.positions, []);
});

test("GET /api/portfolio (legacy v1) is untouched by the v2 addition", async () => {
  const response = await request(app).get("/api/portfolio");
  assert.equal(response.status, 200);
  assert.equal(response.body.portfolio.totalValue, 1240000);
});

test("POST /api/v2/portfolio/orders places a buy, then GET reflects the position and cash change", async () => {
  await withMockedQuote(50, async () => {
    const orderResponse = await request(app)
      .post("/api/v2/portfolio/orders")
      .send({ symbol: "SOFI", side: "BUY", quantity: 20 });

    assert.equal(orderResponse.status, 201);
    assert.equal(orderResponse.body.order.status, "FILLED");

    const summaryResponse = await request(app).get("/api/v2/portfolio");
    assert.equal(summaryResponse.body.cashBalance, 99000); // 100000 - 20*50
    assert.equal(summaryResponse.body.positions.length, 1);
    assert.equal(summaryResponse.body.positions[0].symbol, "SOFI");
  });
});

test("POST /api/v2/portfolio/orders returns 400 for an invalid side", async () => {
  const response = await request(app)
    .post("/api/v2/portfolio/orders")
    .send({ symbol: "AAPL", side: "HOLD", quantity: 1 });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /side must be BUY or SELL/);
});

test("full order lifecycle is reflected across trades, transactions, and reset endpoints", async () => {
  await withMockedQuote(10, async () => {
    await request(app).post("/api/v2/portfolio/orders").send({ symbol: "F", side: "BUY", quantity: 50 });
  });

  const tradesResponse = await request(app).get("/api/v2/portfolio/trades");
  assert.equal(tradesResponse.status, 200);
  assert.equal(tradesResponse.body.trades.length, 1);

  const transactionsResponse = await request(app).get("/api/v2/portfolio/transactions");
  assert.equal(transactionsResponse.status, 200);
  assert.equal(transactionsResponse.body.transactions.length, 1);

  const snapshotResponse = await request(app).post("/api/v2/portfolio/performance/snapshot");
  assert.equal(snapshotResponse.status, 201);

  const performanceResponse = await request(app).get("/api/v2/portfolio/performance");
  assert.equal(performanceResponse.body.timeline.length, 1);

  const resetResponse = await request(app).post("/api/v2/portfolio/reset");
  assert.equal(resetResponse.status, 200);
  assert.equal(resetResponse.body.cashBalance, 100000);

  const tradesAfterReset = await request(app).get("/api/v2/portfolio/trades");
  assert.equal(tradesAfterReset.body.trades.length, 0);
});
