const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');

process.env.OPENAI_API_KEY = 'test-key';
const { askImpactOne } = require('./chatService');

test('rejects an empty question', async () => {
  await assert.rejects(() => askImpactOne({ question: '   ' }), (error) => {
    assert.equal(error.statusCode, 400);
    return true;
  });
});

test('falls back to a friendly message when OpenAI quota is exhausted', async () => {
  const originalPost = axios.post;
  axios.post = async () => {
    const error = new Error('quota exhausted');
    error.response = {
      status: 429,
      data: { error: { message: 'You exceeded your current quota' } },
    };
    throw error;
  };

  try {
    const result = await askImpactOne({
      question: 'What should I buy today?',
      context: { watchlist: ['AAPL'] },
    });

    assert.equal(result.question, 'What should I buy today?');
    assert.equal(result.source, 'fallback');
    assert.match(result.answer, /couldn't generate a live answer/i);
    assert.match(result.providerNotice, /quota/i);
  } finally {
    axios.post = originalPost;
  }
});

test('returns the OpenAI answer on success', async () => {
  const originalPost = axios.post;
  axios.post = async () => ({
    data: { choices: [{ message: { content: 'NVDA looks strong given AI capex trends.' } }] },
  });

  try {
    const result = await askImpactOne({ question: 'How is NVDA doing today specifically?' });
    assert.equal(result.answer, 'NVDA looks strong given AI capex trends.');
    assert.equal(result.source, 'openai');
    assert.equal(result.providerNotice, null);
  } finally {
    axios.post = originalPost;
  }
});
