const investorProfileService = require("../services/investorProfileService");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
}

async function getInvestorProfile(req, res, next) {
  try {
    const profile = await investorProfileService.getInvestorProfile();
    if (!profile) {
      return res.status(404).json({ error: "No investor profile exists yet." });
    }
    res.json(profile);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function createInvestorProfile(req, res, next) {
  try {
    const created = await investorProfileService.createInvestorProfile(req.body || {});
    res.status(201).json(created);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function updateInvestorProfile(req, res, next) {
  try {
    const updated = await investorProfileService.updateInvestorProfile(req.body || {});
    res.json(updated);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getInvestmentProfile(req, res, next) {
  try {
    const profile = await investorProfileService.getInvestorProfile();
    if (!profile) {
      return res.status(404).json({ error: "No investor profile exists yet." });
    }
    res.json(investorProfileService.generateInvestmentProfile(profile));
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = {
  getInvestorProfile,
  createInvestorProfile,
  updateInvestorProfile,
  getInvestmentProfile,
};
