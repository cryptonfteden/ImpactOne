require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseFomcFeed, toFomcEvent } = require("./fomcProvider");

const XML = `<?xml version="1.0"?><rss><channel>
  <item><title><![CDATA[Federal Reserve issues FOMC statement]]></title><link><![CDATA[https://example.com/statement]]></link><pubDate><![CDATA[Wed, 29 Jul 2026 18:00:00 GMT]]></pubDate></item>
  <item><title>Minutes of the Board's discount rate meeting</title><link>https://example.com/other</link><pubDate>Tue, 28 Jul 2026 18:00:00 GMT</pubDate></item>
</channel></rss>`;

test("FOMC provider keeps only FOMC items from the official monetary-policy feed", () => {
  const items = parseFomcFeed(XML);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Federal Reserve issues FOMC statement");
  const event = toFomcEvent(items[0]);
  assert.equal(event.eventType, "fomc-communication");
  assert.deepEqual(event.symbols, ["SPY", "TLT"]);
});
