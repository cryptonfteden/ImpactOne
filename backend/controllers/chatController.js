const { askImpactOne } = require("../services/chatService");

async function askImpactOneController(req, res, next) {
  try {
    const question = req.body?.question || req.query.question;
    const context = req.body?.context || {};
    const result = await askImpactOne({ question, context });
    res.json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
}

module.exports = { askImpactOneController };
