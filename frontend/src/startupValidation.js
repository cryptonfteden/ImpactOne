// Phase X6 — Part 1, Startup Validation Layer.
//
// A real, runtime self-check that runs once at app boot, before anything
// else renders. It cannot catch every possible failure (a genuinely
// missing named export fails at bundle time, not runtime, in this
// Vite/ESM setup) — what it catches is the class of failure that *does*
// survive to runtime: a screen map entry that resolves to `undefined`
// (a typo'd re-export, a conditional import that silently returned
// nothing), a nav item pointing at a screen key that was never
// registered, or a required provider/context value missing. Every issue
// found is real and specific — never a generic "something's wrong."
//
// This module is pure and framework-free (no React import) so it's
// trivially unit-testable without a DOM.

function isValidComponent(value) {
  // A React component is a function (function component, including
  // React.lazy's thenable-wrapped object) or, for React.lazy, an object
  // with a `$$typeof` marker — both are real, checkable shapes.
  if (typeof value === "function") return true;
  if (value && typeof value === "object" && value.$$typeof) return true;
  return false;
}

// Validates that every navigable screen key actually resolves to a real
// component, and that every entry in screenMap is itself valid — catches
// "the nav item exists but the screen it points to is undefined" and
// "a screen is registered but broken" as two distinct, separately
// reported issues.
export function validateScreenMap(screenMap, navigableKeys) {
  const issues = [];

  for (const key of Object.keys(screenMap || {})) {
    if (!isValidComponent(screenMap[key])) {
      issues.push({ area: "screenMap", key, message: `Screen "${key}" is registered but resolved to a non-component value.` });
    }
  }

  for (const key of navigableKeys || []) {
    if (!(key in (screenMap || {}))) {
      issues.push({ area: "navigation", key, message: `Nav item "${key}" has no matching entry in screenMap — this is a dead end.` });
    }
  }

  return issues;
}

// Validates that a set of named required modules/values (e.g. context
// providers, API client instances) are actually present — catches a
// broken provider tree or an import that resolved to undefined.
export function validateRequiredModules(namedValues) {
  const issues = [];
  for (const [name, value] of Object.entries(namedValues || {})) {
    if (value === undefined || value === null) {
      issues.push({ area: "module", key: name, message: `Required module "${name}" is missing (undefined/null) — a broken import or export.` });
    }
  }
  return issues;
}

export function runStartupValidation({ screenMap, navigableKeys, requiredModules } = {}) {
  const issues = [
    ...validateScreenMap(screenMap, navigableKeys),
    ...validateRequiredModules(requiredModules),
  ];
  return { ok: issues.length === 0, issues };
}
