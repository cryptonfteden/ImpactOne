require("../../../test/testEnv");
const test = require("node:test");
const assert = require("node:assert/strict");
const provider = require("./telegramProvider");

test("public Telegram parser keeps only explicitly written tickers and marks secondary evidence", () => {
  const html = `<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message" data-post="interactiveil/123">
    <div class="tgme_widget_message_text js-message_text" dir="auto">מארוול <b>(MRVL)</b> מזנקת בעקבות עסקת שבבי AI עם גוגל<br>אנבידיה (NVDA) מושפעת מהתחרות</div>
    <time datetime="2026-08-20T12:00:00+00:00"></time></div></div>`;
  const [event] = provider.parseInteractiveIsraelHtml(html);
  assert.deepEqual(event.symbols, ["MRVL", "NVDA"]);
  assert.equal(event.sourceUrl, "https://t.me/interactiveil/123");
  assert.equal(event.rawReference.verificationStatus, "SECONDARY_SOURCE_REQUIRES_CORROBORATION");
  assert.ok(event.themes.includes("AI"));
});

test("company names without an explicit ticker are not mapped synthetically", () => {
  const html = `<div class="tgme_widget_message_wrap js-widget_message_wrap"><div data-post="interactiveil/124"><div class="tgme_widget_message_text js-message_text">אפל חשפה מוצר חדש</div><time datetime="2026-08-20T12:00:00Z"></time></div></div>`;
  assert.deepEqual(provider.parseInteractiveIsraelHtml(html)[0].symbols, []);
});

test("breaking label is replaced by the useful next line", () => {
  assert.equal(provider.headlineFromText("🚨ברייקינג🚨\nמניית מודרנה מזנקת בעקבות ניסוי"), "מניית מודרנה מזנקת בעקבות ניסוי");
  assert.equal(provider.headlineFromText("צהריים טובים,\nכל מה שצריך לדעת לקראת פתיחת המסחר\nמניית וולמארט (WMT) במוקד"), "מניית וולמארט (WMT) במוקד");
});
