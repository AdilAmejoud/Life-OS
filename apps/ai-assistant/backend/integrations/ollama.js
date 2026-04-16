/**
 * integrations/ollama.js
 * Extracted from server.js — Ollama HTTP client utilities.
 * Provides: chatWithOllama, streamFromOllama, generateChatTitle, getModel, setModel
 */

const http = require('http');
const db = require('../db');

// Configuration (mirrors server.js top-level constants)
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'host.docker.internal';
const OLLAMA_PORT = parseInt(process.env.OLLAMA_PORT || '11434');
let MODEL = process.env.OLLAMA_MODEL || 'qwen3:4b';

function getModel() { return MODEL; }
function setModel(m) { MODEL = m; }

async function chatWithOllama(messages) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 2048,
        num_ctx: 4096
      }
    });
    const options = {
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) return reject(new Error(json.error));
          const content = json.message?.content;
          if (!content || content.trim() === '') {
            return resolve('(empty response from model)');
          }
          resolve(content);
        } catch { reject(new Error('Parse error: ' + body.slice(0, 200))); }
      });
    });
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('Request timeout after 120s'));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Streaming chat with Ollama (SSE)
async function streamFromOllama(messages, clientRes, convId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      options: {
        temperature: 0.7,
        num_predict: 2048,
        num_ctx: 4096
      }
    });
    const options = {
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    let fullContent = '';
    const ollamaReq = http.request(options, (ollamaRes) => {
      ollamaRes.on('data', chunk => {
        const lines = chunk.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              fullContent += json.message.content;
              clientRes.write(`data: ${JSON.stringify({ type: 'token', content: json.message.content })}\n\n`);
            }
            if (json.done) {
              // Save full message to DB
              db.crud.createMessage(convId, 'assistant', fullContent).catch(() => { });
              clientRes.write(`data: ${JSON.stringify({ type: 'done', content: fullContent })}\n\n`);
              clientRes.end();
              resolve(fullContent);
            }
          } catch (e) { /* skip unparseable lines */ }
        }
      });
      ollamaRes.on('error', (err) => {
        clientRes.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
        clientRes.end();
        reject(err);
      });
    });
    ollamaReq.setTimeout(120000, () => {
      ollamaReq.destroy();
      clientRes.write(`data: ${JSON.stringify({ type: 'error', error: 'Timeout after 120s' })}\n\n`);
      clientRes.end();
      reject(new Error('Timeout'));
    });
    ollamaReq.on('error', (err) => {
      clientRes.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      clientRes.end();
      reject(err);
    });
    ollamaReq.write(data);
    ollamaReq.end();
  });
}

// Generate a short chat title from user message using AI
async function generateChatTitle(userMessage) {
  try {
    const title = await chatWithOllama([
      { role: 'system', content: 'Generate a short 3-5 word title for a chat. Reply with ONLY the title, no quotes or punctuation.' },
      { role: 'user', content: `Title for this chat: ${userMessage}` }
    ]);
    const cleanTitle = title.trim().split('\n')[0].substring(0, 50);
    return cleanTitle || userMessage.trim().split('\n')[0].substring(0, 35);
  } catch {
    return userMessage.trim().split('\n')[0].substring(0, 35);
  }
}

module.exports = {
  getModel,
  setModel,
  chatWithOllama,
  streamFromOllama,
  generateChatTitle,
  OLLAMA_HOST,
  OLLAMA_PORT
};
