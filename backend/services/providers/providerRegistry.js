const { validateProviderShape } = require("./baseProviderContract");

const reutersBloombergWireProvider = require("./definitions/reutersBloombergWireProvider");
const secProvider = require("./definitions/secProvider");
const redditProvider = require("./definitions/redditProvider");
const xProvider = require("./definitions/xProvider");
const telegramProvider = require("./definitions/telegramProvider");
const polymarketProvider = require("./definitions/polymarketProvider");
const fedProvider = require("./definitions/fedProvider");
const ecbProvider = require("./definitions/ecbProvider");
const fomcProvider = require("./definitions/fomcProvider");
const fdaProvider = require("./definitions/fdaProvider");
const nasaProvider = require("./definitions/nasaProvider");
const treasuryProvider = require("./definitions/treasuryProvider");
const congressProvider = require("./definitions/congressProvider");
const earningsProvider = require("./definitions/earningsProvider");
const patentProvider = require("./definitions/patentProvider");
// Sprint 37 — Market Intelligence Source Layer.
const finvizProvider = require("./definitions/finvizProvider");
const tipranksProvider = require("./definitions/tipranksProvider");
const zacksProvider = require("./definitions/zacksProvider");
const spdrProvider = require("./definitions/spdrProvider");
const cftcCotProvider = require("./definitions/cftcCotProvider");
const coinglassProvider = require("./definitions/coinglassProvider");
const optionsFlowProvider = require("./definitions/optionsFlowProvider");
const finraShortVolumeProvider = require("./definitions/finraShortVolumeProvider");
const federalRegisterProvider = require("./definitions/federalRegisterProvider");
const doeNewsProvider = require("./definitions/doeNewsProvider");

const PROVIDERS = [
  reutersBloombergWireProvider,
  secProvider,
  redditProvider,
  xProvider,
  telegramProvider,
  polymarketProvider,
  fedProvider,
  ecbProvider,
  fomcProvider,
  fdaProvider,
  nasaProvider,
  treasuryProvider,
  congressProvider,
  earningsProvider,
  patentProvider,
  finvizProvider,
  tipranksProvider,
  zacksProvider,
  spdrProvider,
  cftcCotProvider,
  coinglassProvider,
  optionsFlowProvider,
  finraShortVolumeProvider,
  federalRegisterProvider,
  doeNewsProvider,
];

// Startup-time self-check: every provider built by createProvider() already
// validated its own shape at construction, but this re-checks the whole
// registry as one assertion — if a future provider is added by hand
// (bypassing the factory) instead of via createProvider, this still catches
// it before it's ever scheduled.
for (const provider of PROVIDERS) {
  const { valid, missingFields } = validateProviderShape(provider);
  if (!valid) {
    throw new Error(`Registered provider "${provider?.providerId || "(unknown)"}" is malformed: missing ${missingFields.join(", ")}`);
  }
}

function listProviders() {
  return PROVIDERS;
}

function getProvider(providerId) {
  return PROVIDERS.find((provider) => provider.providerId === providerId) || null;
}

module.exports = { listProviders, getProvider };
