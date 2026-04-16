/**
 * routes/reasoning.js
 * POST /api/reasoning  — build a reasoning-augmented prompt
 *
 * Extracted from server.js (lines 1208–1236).
 */

const reasoning = require('../core/reasoning');

module.exports = async function handleReasoning(req, res) {
  if (req.method === 'POST' && req.url === '/api/reasoning') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { mode, message, context } = JSON.parse(body);
        const reasoningMode = mode || 'basic';

        // Validate mode
        const validModes = ['none', 'basic', 'deep', 'reflective'];
        if (!validModes.includes(reasoningMode)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Invalid mode. Use: ${validModes.join(', ')}` }));
          return;
        }

        const prompt = reasoning.buildReasoningPrompt(message, reasoningMode, context);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ prompt, mode: reasoningMode }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  return false;
};
