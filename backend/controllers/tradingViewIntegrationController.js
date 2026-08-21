const service = require("../services/tradingViewIntegrationService");
const datafeed = require("../services/tradingViewDatafeedService");

function status(req, res) { res.json(service.getStatus()); }
async function signals(req, res, next) {
  try { res.json({ signals: await service.getRecentSignals(req.query.limit) }); } catch (error) { next(error); }
}

async function webhook(req, res, next) {
  try { res.status(202).json(await service.receiveWebhook(req.body)); }
  catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return next(error);
  }
}

function datafeedConfig(_req, res) { res.json(datafeed.config()); }
function datafeedTime(_req, res) { res.type("text/plain").send(String(Math.floor(Date.now() / 1000))); }
async function datafeedSearch(req, res, next) {
  try { res.json(await datafeed.search(req.query.query, req.query.limit)); } catch (error) { next(error); }
}
async function datafeedSymbols(req, res, next) {
  try {
    const symbol = await datafeed.resolve(req.query.symbol);
    if (!symbol) return res.status(400).json({ s: "error", errmsg: "Invalid symbol." });
    return res.json(symbol);
  } catch (error) { return next(error); }
}
async function datafeedHistory(req, res, next) {
  try { res.json(await datafeed.history(req.query)); } catch (error) { next(error); }
}

module.exports = { status, signals, webhook, datafeedConfig, datafeedTime, datafeedSearch, datafeedSymbols, datafeedHistory };
