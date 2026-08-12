require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseFundTopHoldings, toSpdrEvent } = require("./spdrProvider");

const PAGE = `<button>Fund Top Holdings</button><span class="date">as of Aug 06 2026</span><table><tr><td data-label="Name:">APPLE INC</td><td data-label="Shares Held:">48,000,000</td><td data-label="Weight:">12.41%</td></tr></table><button>Index Top Holdings</button>`;

test("SPDR provider parses the official fund top-holdings table", () => {
  const data = parseFundTopHoldings(PAGE);
  assert.deepEqual(data, { asOf: "2026-08-06", holdings: [{ name: "APPLE INC", sharesHeld: "48,000,000", weight: 12.41 }] });
  const event = toSpdrEvent({ ticker: "XLK", sector: "Information Technology" }, data, "https://example.com");
  assert.equal(event.eventType, "spdr-etf-holdings");
  assert.match(event.summary, /not creation\/redemption flow data/);
});
