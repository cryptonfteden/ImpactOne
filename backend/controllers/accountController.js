const accountService = require("../services/accountService");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message, errorCode: error.errorCode });
  }
  return next(error);
}

async function getAccount(req, res, next) {
  try {
    const account = await accountService.getAccount(req.userId);
    res.json(account);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function upgrade(req, res, next) {
  try {
    const { planKey, priceId } = req.body || {};
    if (!planKey) {
      const error = new Error("planKey is required.");
      error.statusCode = 400;
      error.errorCode = "MISSING_PLAN_KEY";
      throw error;
    }
    const result = await accountService.upgradePlan(req.userId, planKey, { priceId });
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function cancel(req, res, next) {
  try {
    const subscription = await accountService.cancelPlan(req.userId);
    res.json({ subscription });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getAccount, upgrade, cancel };
