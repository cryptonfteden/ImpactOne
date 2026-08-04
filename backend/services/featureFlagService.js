// Phase X9 — Part 4, Feature Flags. Real, server-side, toggleable state —
// "no code changes required for toggling" means every evaluation reads
// this table fresh; nothing here is cached at process-start or baked
// into a build. Four real modes, matching the mission's exact four
// required states.
const featureFlagRepository = require("./featureFlagRepository");

const VALID_MODES = ["ENABLED", "DISABLED", "BETA_ONLY", "USER_SPECIFIC"];

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function listFlags() {
  return featureFlagRepository.listFlags();
}

async function setFlag(key, { mode, enabledForUsers, description }) {
  const trimmedKey = String(key || "").trim();
  if (!trimmedKey) throw badRequest("A real flag key is required.");
  if (!VALID_MODES.includes(mode)) throw badRequest(`mode must be one of ${VALID_MODES.join(", ")}.`);
  return featureFlagRepository.upsertFlag(trimmedKey, {
    mode,
    enabledForUsers: Array.isArray(enabledForUsers) ? enabledForUsers.filter((id) => typeof id === "string") : [],
    description: description || null,
  });
}

// The real evaluation function every future feature checks. `betaUserId`
// is optional — a flag can be evaluated for an anonymous/no-identity
// request too, which only ENABLED/DISABLED can meaningfully answer for
// (BETA_ONLY/USER_SPECIFIC both require a real identity to say yes to).
async function isFeatureEnabled(key, betaUserId) {
  const flag = await featureFlagRepository.getFlag(key);
  if (!flag) return false; // an undeclared flag defaults closed, never fabricated as enabled
  switch (flag.mode) {
    case "ENABLED":
      return true;
    case "DISABLED":
      return false;
    case "BETA_ONLY":
      return Boolean(betaUserId);
    case "USER_SPECIFIC":
      return Boolean(betaUserId) && flag.enabledForUsers.includes(betaUserId);
    default:
      return false;
  }
}

module.exports = { listFlags, setFlag, isFeatureEnabled, VALID_MODES };
