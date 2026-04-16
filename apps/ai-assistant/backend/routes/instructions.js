/**
 * routes/instructions.js
 * GET    /api/instructions         — list all
 * GET    /api/instructions/active  — list active
 * POST   /api/instructions         — create
 * DELETE /api/instructions/:id     — delete
 * PATCH  /api/instructions/:id     — update
 *
 * Extracted from server.js (lines 948–1012).
 */

const instructions = require('../context/instructions');

module.exports = async function handleInstructions(req, res) {
  if (req.method === 'GET' && req.url === '/api/instructions/active') {
    const activeInstructions = await instructions.getActiveInstructions();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(activeInstructions));
    return true;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/instructions')) {
    const enabledOnly = req.url.includes('enabled=true');
    const instructionsList = await instructions.listInstructions(!enabledOnly);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(instructionsList));
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/instructions') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { name, content, category, priority } = JSON.parse(body);
        const result = await instructions.createInstruction(name, content, category, priority);
        if (result.error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  if (req.method === 'DELETE' && req.url.match(/^\/api\/instructions\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    const result = await instructions.deleteInstruction(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return true;
  }

  if (req.method === 'PATCH' && req.url.match(/^\/api\/instructions\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const updates = JSON.parse(body);
        const result = await instructions.updateInstruction(id, updates);
        res.writeHead(200, { 'Content-Type': 'application/json' });
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
