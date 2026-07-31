const authService = require("../services/authService");
const { extractBearerToken } = require("../middleware/requireAuth");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message, errorCode: error.errorCode });
  }
  return next(error);
}

async function register(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const result = await authService.register(email, password);
    res.status(201).json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function logout(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (token) await authService.logout(token);
    res.json({ loggedOut: true });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function me(req, res) {
  res.json({ userId: req.userId });
}

module.exports = { register, login, logout, me };
