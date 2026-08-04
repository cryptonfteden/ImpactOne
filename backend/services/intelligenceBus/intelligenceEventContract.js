// Phase AI-ENGINE-003 — Platform Intelligence Bus. The one canonical
// intelligence event contract every engine must satisfy to publish
// (INTELLIGENCE_EVENT_SCHEMA.md). Validates the RAW event a publishing
// engine submits, before the Bus computes its own derived fields
// (dedup key, identity key, normalized confidence, lifecycle, expiry).
const { isKnownEngine } = require("./intelligenceBusRegistry");

const REQUIRED_RAW_FIELDS = ["engineId", "eventType", "symbols", "payload", "provenance", "publishedAt", "methodologyVersion"];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(date.getTime());
}

/**
 * Validates a raw engine submission. Never throws — returns
 * { valid, errors } so a malformed publish attempt from one engine is a
 * routine, loggable event, not a crash that could take the whole Bus
 * down for every other engine.
 */
function validateRawEvent(raw = {}) {
  const errors = [];

  for (const field of REQUIRED_RAW_FIELDS) {
    if (raw[field] === undefined || raw[field] === null) {
      errors.push(`${field}: required`);
    }
  }

  if (raw.engineId !== undefined && !isNonEmptyString(raw.engineId)) {
    errors.push("engineId: must be a non-empty string");
  } else if (raw.engineId !== undefined && !isKnownEngine(raw.engineId)) {
    errors.push(`engineId: "${raw.engineId}" is not a registered engine — see intelligenceBusRegistry.KNOWN_ENGINES`);
  }

  if (raw.eventType !== undefined && !isNonEmptyString(raw.eventType)) {
    errors.push("eventType: must be a non-empty string");
  }

  if (raw.symbols !== undefined && (!Array.isArray(raw.symbols) || raw.symbols.some((symbol) => !isNonEmptyString(symbol)))) {
    errors.push("symbols: must be an array of non-empty strings (may be empty for a market-wide event, e.g. sentiment)");
  }

  if (raw.payload !== undefined && (typeof raw.payload !== "object" || raw.payload === null || Array.isArray(raw.payload))) {
    errors.push("payload: must be a plain object");
  }

  if (raw.provenance !== undefined && (typeof raw.provenance !== "object" || raw.provenance === null || Array.isArray(raw.provenance))) {
    errors.push("provenance: must be a plain object");
  } else if (raw.provenance && !isNonEmptyString(raw.provenance.sourceEngine)) {
    errors.push("provenance.sourceEngine: required, non-empty string");
  }

  if (raw.publishedAt !== undefined && !isValidDate(raw.publishedAt)) {
    errors.push("publishedAt: must be a valid date");
  }

  if (raw.methodologyVersion !== undefined && !isNonEmptyString(raw.methodologyVersion)) {
    errors.push("methodologyVersion: must be a non-empty string");
  }

  if (raw.confidence !== undefined && raw.confidence !== null) {
    const confidence = Number(raw.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
      errors.push("confidence: when present, must be a finite number in [0, 100]");
    }
  }

  if (raw.evidenceRefs !== undefined && raw.evidenceRefs !== null && !Array.isArray(raw.evidenceRefs)) {
    errors.push("evidenceRefs: when present, must be an array");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { REQUIRED_RAW_FIELDS, validateRawEvent };
