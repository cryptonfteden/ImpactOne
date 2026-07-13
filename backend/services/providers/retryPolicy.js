/**
 * Exponential backoff retry, no dependency. Used by providerIngestionService
 * around provider.fetch() — a flaky external source shouldn't fail an
 * entire ingestion run on the first transient error.
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 200 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await delay(baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }
  throw lastError;
}

module.exports = { withRetry };
