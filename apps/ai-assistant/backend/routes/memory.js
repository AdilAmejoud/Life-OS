/**
 * routes/memory.js
 * GET  /api/memory  — list memory entries (optional ?type=)
 * POST /api/memory  — set a memory entry
 *
 * Extracted from server.js (lines 632–658).
 */

const db = require('../db');

module.exports = async function handleMemory(req, res) {
  if (req.method === 'GET' && req.url.startsWith('/api/memory')) {
    const type = req.url.split('?').length > 1 ? new URLSearchParams(req.url.split('?')[1]).get('type') : null;
    const result = await db.crud.listMemory(type);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/memory') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { type, key, value } = JSON.parse(body);
        const result = await db.crud.setMemory(type, key, value);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  return false;
};
