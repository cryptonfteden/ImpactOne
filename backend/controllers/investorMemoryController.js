const investorMemoryService = require("../services/investorMemoryService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getInvestorMemory(req, res, next) {
  try {
    const memory = await investorMemoryService.getInvestorMemory(req.betaUserId);
    res.json(memory);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getInvestorMemory };
