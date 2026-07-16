const investorMemoryService = require("../services/investorMemoryService");

async function getInvestorMemory(req, res, next) {
  try {
    const memory = await investorMemoryService.getInvestorMemory();
    res.json(memory);
  } catch (error) {
    next(error);
  }
}

module.exports = { getInvestorMemory };
