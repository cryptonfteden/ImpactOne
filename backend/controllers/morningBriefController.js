// Phase PRODUCT-001 — thin pass-through controller, same discipline as
// every other v2 controller: no computation here, just the one canonical
// morningBriefService call.
const morningBriefService = require("../services/morningBrief/morningBriefService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getToday(req, res, next) {
  try {
    const brief = await morningBriefService.generateMorningBrief({ betaUserId: req.betaUserId });
    res.json(brief);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getToday };
