/**
 * routes/userData.js
 * GET    /api/user-data                 — list user data (optional ?category=)
 * GET    /api/user-data/profile         — get user profile summary
 * POST   /api/user-data                 — store user data item
 * DELETE /api/user-data/:category/:key  — delete user data item
 *
 * Extracted from server.js (lines 1092–1139).
 */

const userData = require('../context/userData');
const systemPrompt = require('../context/systemPrompt');

module.exports = async function handleUserData(req, res) {
  if (req.method === 'GET' && req.url === '/api/user-data/profile') {
    const profile = await systemPrompt.getUserProfile();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(profile));
    return true;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/user-data')) {
    const category = new URLSearchParams(req.url.split('?')[1] || '').get('category');
    const userDataList = await userData.listUserData(category || null);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(userDataList));
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/user-data') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { category, key, value, confidence } = JSON.parse(body);
        const result = await userData.storeUserData({ category, key, value, confidence });
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

  if (req.method === 'DELETE' && req.url.match(/^\/api\/user-data\/([^/]+)\/([^/]+)$/)) {
    const category = decodeURIComponent(req.url.split('/')[3]);
    const key = decodeURIComponent(req.url.split('/')[4]);
    const result = await userData.deleteUserDataItem(category, key);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return true;
  }

  return false;
};
