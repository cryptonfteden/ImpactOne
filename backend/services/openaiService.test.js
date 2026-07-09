const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');

process.env.OPENAI_API_KEY = 'test-key';
const { analyzeTicker } = require('./openaiService');

test('falls back to a structured report when OpenAI quota is exhausted', async () => {
  const originalPost = axios.post;
  axios.post = async () => {
    const error = new Error('quota exhausted');
    error.response = {
      status: 429,
      data: {
        error: {
          message: 'You exceeded your current quota',
        },
      },
    };
    throw error;
  };

  try {
    const result = await analyzeTicker('AAPL', {
      quote: { price: 192.5, change: 1.2 },
      company: { name: 'Apple Inc.' },
    });

    assert.equal(result.symbol, 'AAPL');
    assert.match(result.executiveSummary, /AAPL|Apple/i);
    assert.ok(result.bullCase.length > 0);
    assert.ok(result.keyRisks.length > 0);
    assert.equal(result.source, 'fallback');
    assert.match(result.providerError, /quota/i);
  } finally {
    axios.post = originalPost;
  }
});
