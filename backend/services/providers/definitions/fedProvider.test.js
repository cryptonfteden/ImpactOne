require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseFedPressFeed, toFedEvent } = require("./fedProvider");

test("Fed provider keeps general press releases and leaves FOMC messages to the dedicated provider", () => {
  const xml = '<rss><channel><item><title><![CDATA[Federal Reserve releases bank data]]></title><link>https://example.com/fed</link><pubDate>Fri, 07 Aug 2026 18:00:00 GMT</pubDate></item><item><title>Federal Reserve issues FOMC statement</title><link>https://example.com/fomc</link><pubDate>Thu, 06 Aug 2026 18:00:00 GMT</pubDate></item></channel></rss>';
  const items = parseFedPressFeed(xml);
  assert.equal(items.length, 1);
  assert.equal(toFedEvent(items[0]).eventType, "federal-reserve-press-release");
});
