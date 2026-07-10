import React from "react";

const RELEVANT_OBJECT_KEYS = ["summary", "description", "text", "label", "value", "message", "reason", "currentPrice", "marketCap", "peRatio", "trend", "analystConsensus", "title"];

function formatLabel(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function renderSafeValue(value, fallback = "-") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => renderSafeValue(item, fallback)).join(" • ");
  }

  if (typeof value === "object") {
    for (const key of RELEVANT_OBJECT_KEYS) {
      if (value[key] !== null && value[key] !== undefined && value[key] !== "") {
        return renderSafeValue(value[key], fallback);
      }
    }

    const entries = Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== "");
    if (entries.length) {
      return entries
        .slice(0, 4)
        .map(([key, item]) => `${formatLabel(key)}: ${renderSafeValue(item, fallback)}`)
        .join(" | ");
    }

    try {
      return JSON.stringify(value);
    } catch (error) {
      return fallback;
    }
  }

  return fallback;
}

export function SafeValue({ value, fallback = "-" }) {
  return <>{renderSafeValue(value, fallback)}</>;
}

export function SafeList({ value, fallback = "-", className = "stack-list" }) {
  if (!Array.isArray(value)) {
    return <p>{renderSafeValue(value, fallback)}</p>;
  }

  if (!value.length) {
    return <p>{fallback}</p>;
  }

  return (
    <ul className={className}>
      {value.map((item, index) => (
        <li key={`${typeof item}-${index}`}>{renderSafeValue(item, fallback)}</li>
      ))}
    </ul>
  );
}
