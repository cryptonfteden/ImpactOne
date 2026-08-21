require("../../../test/testEnv");
const test = require("node:test");
const assert = require("node:assert/strict");
const provider = require("./doeNewsProvider");

test("DOE news parser keeps official evidence and never invents a stock symbol", () => {
  const html = `<div class="views-row">
    <div class="views-field views-field-field-display-date"><time datetime="2026-08-20T14:00:00Z">August 20, 2026</time></div>
    <div class="views-field views-field-title"><a href="/articles/grid-award">DOE Awards $2 Billion for Grid Deployment</a></div>
    <div class="views-field views-field-field-summary"><div class="field-content">Funding supports transmission capacity. <a>Read more</a></div></div>
  </div>`;
  const [event] = provider.parseDoeNewsHtml(html);
  assert.equal(event.sourceName, "U.S. Department of Energy");
  assert.equal(event.sourceUrl, "https://www.energy.gov/articles/grid-award");
  assert.deepEqual(event.symbols, []);
  assert.ok(event.themes.includes("ENERGY"));
  assert.equal(event.rawReference.noSyntheticCompanyMapping, true);
});

test("DOE parser deduplicates repeated navigation and page entries", () => {
  const row = `<time datetime="2026-08-20T14:00:00Z"></time><div class="views-field-title"><a href="/articles/a">Nuclear deployment award</a></div>`;
  assert.equal(provider.parseDoeNewsHtml(`${row}${row}`).length, 1);
});
