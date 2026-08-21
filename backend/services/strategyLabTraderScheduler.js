const cron = require("node-cron");
const trader = require("./strategyLabTraderService");

let cycleTask = null;
let reportTask = null;

function start() {
  if (cycleTask) return;
  cycleTask = cron.schedule("*/15 * * * 1-5", () => trader.executeCycle().catch(() => {}), { timezone: "Asia/Jerusalem" });
  reportTask = cron.schedule("0 9 * * 0", () => trader.generateWeeklyReport().catch(() => {}), { timezone: "Asia/Jerusalem" });
  const immediate = setTimeout(() => trader.executeCycle().catch(() => {}), 5000);
  if (immediate.unref) immediate.unref();
}

function stop() {
  cycleTask?.stop();
  reportTask?.stop();
  cycleTask = null;
  reportTask = null;
}

function getStatus() { return { running: Boolean(cycleTask), paperTradingOnly: true, cycle: "Every 15 minutes on market weekdays", weeklyReport: "Sunday 09:00 Asia/Jerusalem" }; }

module.exports = { start, stop, getStatus };
