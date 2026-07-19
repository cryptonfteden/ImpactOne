const intelligenceCommitteeService = require("../services/intelligenceCommittee/intelligenceCommitteeService");

async function convene(req, res, next) {
  try {
    res.json(await intelligenceCommitteeService.convene(req.params.symbol));
  } catch (error) {
    next(error);
  }
}

module.exports = { convene };
