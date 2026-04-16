/**
 * routes/n8n.js
 * GET    /api/n8n/status              — test n8n connection
 * GET    /api/n8n/workflows           — list workflows
 * POST   /api/n8n/trigger/:workflowId — trigger a workflow
 * POST   /api/n8n/maybe-trigger       — maybe-trigger based on message
 * GET    /api/n8n/connected           — get saved/connected workflows from DB
 * POST   /api/n8n/connect             — save workflow to DB
 * DELETE /api/n8n/disconnect/:id      — remove workflow from DB
 *
 * Extracted from server.js (lines 776–876).
 */

const n8n = require('../integrations/n8n');
const db = require('../db');

module.exports = async function handleN8n(req, res) {
  if (req.method === 'GET' && req.url === '/api/n8n/status') {
    const status = await n8n.testConnection();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
    return true;
  }

  if (req.method === 'GET' && req.url === '/api/n8n/workflows') {
    const workflows = await n8n.listWorkflows();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(workflows));
    return true;
  }

  if (req.method === 'POST' && req.url.match(/^\/api\/n8n\/trigger\/(.+)$/)) {
    const workflowId = req.url.split('/')[5];
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { payload } = JSON.parse(body);
        const result = await n8n.triggerWorkflow(workflowId, payload || {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/n8n/maybe-trigger') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);
        const result = await n8n.maybeTriggerWorkflow(message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  // Get connected (saved) workflows from local DB
  if (req.method === 'GET' && req.url === '/api/n8n/connected') {
    try {
      const connected = await db.crud.listWorkflows();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(connected));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return true;
  }

  // Connect a workflow (save to local DB)
  if (req.method === 'POST' && req.url === '/api/n8n/connect') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { workflowId, name, webhookUrl } = JSON.parse(body);
        if (!workflowId || !name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'workflowId and name are required' }));
          return;
        }
        const result = await db.crud.saveWorkflow(workflowId, name, webhookUrl || '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  // Disconnect a workflow (remove from local DB)
  if (req.method === 'DELETE' && req.url.match(/^\/api\/n8n\/disconnect\/(.+)$/)) {
    const workflowId = req.url.split('/')[4];
    try {
      const result = await db.crud.deleteWorkflow(workflowId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return true;
  }

  return false;
};
