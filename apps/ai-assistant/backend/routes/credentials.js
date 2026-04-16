/**
 * routes/credentials.js
 * GET    /api/credentials              — list all (optional ?service=)
 * GET    /api/credentials/:service     — list by service
 * POST   /api/credentials              — save a credential
 * DELETE /api/credentials/:svc/:key    — delete a credential
 *
 * Extracted from server.js (lines 878–946, de-duplicated from 1144–1206).
 * NOTE: server.js had this block defined TWICE — only one canonical version is kept here.
 */

const db = require('../db');

module.exports = async function handleCredentials(req, res) {
  if (req.method === 'GET' && req.url.startsWith('/api/credentials')) {
    // Check for /api/credentials/:service pattern first
    const svcMatch = req.url.match(/^\/api\/credentials\/([^/]+)$/);
    if (svcMatch) {
      const service = decodeURIComponent(svcMatch[1]);
      try {
        const credentials = await db.crud.listCredentials(service);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(credentials));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return true;
    }

    // /api/credentials (list all, optional ?service= query param)
    const service = new URLSearchParams(req.url.split('?')[1] || '').get('service');
    try {
      const credentials = service
        ? await db.crud.listCredentials(service)
        : await db.crud.listCredentials();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(credentials));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/credentials') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { service, keyName, value, encrypted } = JSON.parse(body);
        if (!service || !keyName || value === undefined) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'service, keyName, and value are required' }));
          return;
        }
        const result = await db.crud.saveCredential(service, keyName, value, encrypted);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  if (req.method === 'DELETE' && req.url.match(/^\/api\/credentials\/([^/]+)\/([^/]+)$/)) {
    const service = decodeURIComponent(req.url.split('/')[3]);
    const keyName = decodeURIComponent(req.url.split('/')[4]);
    try {
      const result = await db.crud.deleteCredential(service, keyName);
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
