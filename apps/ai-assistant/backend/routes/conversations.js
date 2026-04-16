/**
 * routes/conversations.js
 * GET    /api/conversations          — list
 * GET    /api/conversations/:id      — get with messages
 * POST   /api/conversations          — create
 * DELETE /api/conversations/:id      — delete
 *
 * Extracted from server.js (lines 530–572).
 */

const db = require('../db');
const { getModel } = require('../integrations/ollama');

module.exports = async function handleConversations(req, res) {
  if (req.method === 'GET' && req.url === '/api/conversations') {
    const conversations = await db.crud.listConversations(50);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(conversations));
    return true;
  }

  if (req.method === 'GET' && req.url.match(/^\/api\/conversations\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    const messages = await db.crud.getMessages(id, 100);
    const conversation = await db.crud.getConversation(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ conversation, messages }));
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/conversations') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { title, model } = JSON.parse(body);
        const conv = await db.crud.createConversation(title || 'New Chat', model || getModel());
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(conv));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  if (req.method === 'DELETE' && req.url.match(/^\/api\/conversations\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    await db.crud.deleteConversation(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return true;
  }

  return false;
};
