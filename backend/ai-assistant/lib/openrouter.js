/**
 * OpenRouter API Client
 * Supports chat completions with function-calling and streaming.
 *
 * Env vars:
 *   OPENROUTER_API_KEY  — required for all calls
 *   OPENROUTER_MODEL    — default model (optional)
 */

'use strict';

const https = require('https');

const BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-3.1-pro-preview';

function getApiKey() {
  return process.env.OPENROUTER_API_KEY || '';
}

function isAvailable() {
  return Boolean(getApiKey());
}

/**
 * Convert an Error (or anything) to a plain string message.
 */
function asErrorMessage(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || 'Error';
  try { return JSON.stringify(err); } catch { return 'Unknown error'; }
}

/**
 * Low-level HTTPS POST to OpenRouter.
 * Returns the full parsed JSON body.
 */
function openRouterPost(path, body) {
  return new Promise((resolve, reject) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      return reject(new Error('OPENROUTER_API_KEY is not set'));
    }

    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: `/api/v1${path}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'HTTP-Referer': 'http://localhost:3700',
        'X-Title': 'NEXUS AI Assistant'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            const msg = json?.error?.message || json?.error || `HTTP ${res.statusCode}`;
            return reject(new Error(`OpenRouter error: ${msg}`));
          }
          resolve(json);
        } catch (e) {
          reject(new Error(`OpenRouter parse error: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('OpenRouter request timeout')); });
    req.write(bodyStr);
    req.end();
  });
}

/**
 * Non-streaming chat completion.
 *
 * @param {object} opts
 * @param {string} opts.model
 * @param {object[]} opts.messages
 * @param {object[]} [opts.tools]        - OpenAI function-calling format
 * @param {string}   [opts.tool_choice]  - 'auto' | 'none' | specific tool
 * @returns {Promise<{content: string|null, tool_calls: object[]|null}>}
 */
async function chatCompletion({ model = DEFAULT_MODEL, messages, tools, tool_choice }) {
  const body = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 1500
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = tool_choice || 'auto';
  }

  const response = await openRouterPost('/chat/completions', body);
  const choice = response?.choices?.[0];
  if (!choice) throw new Error('OpenRouter returned no choices');

  return {
    content: choice.message?.content ?? null,
    tool_calls: choice.message?.tool_calls ?? null,
    finish_reason: choice.finish_reason
  };
}

/**
 * Streaming chat completion (no tool-calling — for final text delivery).
 * Calls `onToken(text)` for each streamed token.
 * Returns the full assembled text.
 *
 * @param {object} opts
 * @param {string} opts.model
 * @param {object[]} opts.messages
 * @param {function} opts.onToken
 * @returns {Promise<string>}
 */
function streamChatCompletion({ model = DEFAULT_MODEL, messages, onToken }) {
  return new Promise((resolve, reject) => {
    const apiKey = getApiKey();
    if (!apiKey) return reject(new Error('OPENROUTER_API_KEY is not set'));

    const body = JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1500
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'HTTP-Referer': 'http://localhost:3700',
        'X-Title': 'NEXUS AI Assistant'
      }
    };

    let fullContent = '';
    let buffer = '';

    const req = https.request(options, (res) => {
      if (res.statusCode >= 400) {
        let errBody = '';
        res.on('data', (c) => { errBody += c; });
        res.on('end', () => reject(new Error(`OpenRouter stream error HTTP ${res.statusCode}: ${errBody.slice(0, 200)}`)));
        return;
      }

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';   // keep incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              if (typeof onToken === 'function') onToken(delta);
            }
          } catch { /* partial chunk — skip */ }
        }
      });

      res.on('end', () => resolve(fullContent));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('OpenRouter stream timeout')); });
    req.write(body);
    req.end();
  });
}

module.exports = {
  isAvailable,
  asErrorMessage,
  chatCompletion,
  streamChatCompletion,
  DEFAULT_MODEL
};
