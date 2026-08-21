const test = require("node:test");
const assert = require("node:assert/strict");
const { parseOfficialDirectories } = require("./usEquityUniverseService");

test("official symbol directories keep operating equities and reject funds and derivative securities", () => {
  const nasdaq = [
    "Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares",
    "AAPL|Apple Inc. - Common Stock|Q|N|N|100|N|N",
    "QQQ|Invesco QQQ Trust ETF|Q|N|N|100|Y|N",
    "TEST|Test Security|Q|Y|N|100|N|N",
    "File Creation Time: 0815202612:00|||||||",
  ].join("\n");
  const other = [
    "ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol",
    "BRK.B|Berkshire Hathaway Inc. Class B Common Stock|N|BRK.B|N|100|N|BRK.B",
    "XYZ.W|Example Warrants|A|XYZ.W|N|100|N|XYZ.W",
    "SPY|SPDR S&P 500 ETF Trust|P|SPY|Y|100|N|SPY",
    "File Creation Time: 0815202612:00|||||||",
  ].join("\n");
  assert.deepEqual(parseOfficialDirectories(nasdaq, other), [
    { symbol: "AAPL", name: "Apple Inc. - Common Stock", exchange: "NASDAQ" },
    { symbol: "BRK.B", name: "Berkshire Hathaway Inc. Class B Common Stock", exchange: "NYSE" },
  ]);
});
