/**
 * routes/models.js
 * GET  /api/models         — list available Ollama models
 * POST /api/models/switch  — switch the active model
 * GET  /api/search?q=      — web search proxy
 *
 * Extracted from server.js (lines 190–260).
 */

const http = require('http');
const webSearch = require('../integrations/webSearch');
const { getModel, setModel, OLLAMA_HOST, OLLAMA_PORT } = require('../integrations/ollama');

module.exports = async function handleModels(req, res) {
  // List available Ollama models
  if (req.method === 'GET' && req.url === '/api/models') {
    try {
      const modelsData = await new Promise((resolve, reject) => {
        const req = http.request({ hostname: OLLAMA_HOST, port: OLLAMA_PORT, path: '/api/tags', method: 'GET' }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
        });
        req.on('error', reject);
        req.end();
      });
      const models = (modelsData.models || []).map(m => ({
        name: m.name,
        size: m.size,
        modified_at: m.modified_at,
        family: m.details?.family || '',
        parameter_size: m.details?.parameter_size || ''
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ current: getModel(), models }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return true;
  }

  // Switch active model
  if (req.method === 'POST' && req.url === '/api/models/switch') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { model } = JSON.parse(body);
        if (!model) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'model is required' }));
          return;
        }
        setModel(model);
        console.log(`Model switched to: ${getModel()}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, model: getModel() }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  // Web Search endpoint
  if (req.method === 'GET' && req.url.startsWith('/api/search?')) {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const query = params.get('q');
    if (!query) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'q parameter required' }));
      return true;
    }
    try {
      const results = await webSearch.search(query, 5);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ query, results }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return true;
  }

  return false;
};
