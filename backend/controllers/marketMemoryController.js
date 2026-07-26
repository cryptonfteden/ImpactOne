const marketMemoryService = require("../services/marketMemoryService");

function parseListParam(value) {
  if (!value) return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

async function getSimilarHistory(req, res, next) {
  try {
    const symbols = parseListParam(req.query.symbols);
    const sectors = parseListParam(req.query.sectors);
    res.json(await marketMemoryService.findSimilarHistory({ symbols, sectors }));
  } catch (error) {
    next(error);
  }
}

module.exports = { getSimilarHistory };
