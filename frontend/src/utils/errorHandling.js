export function normalizeError(error, fallbackMessage = "Unexpected error") {
  if (!error) {
    return { message: fallbackMessage };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return {
    message: error.message || fallbackMessage,
    stack: error.stack,
  };
}

export function logError(scope, error) {
  const normalized = normalizeError(error);
  console.error(`[frontend] ${scope}`, normalized.message, normalized.stack || "");
}

export async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}
