/**
 * routes/skills.js
 * GET    /api/skills              — list skills
 * POST   /api/skills              — create skill
 * PATCH  /api/skills/:id          — update skill
 * DELETE /api/skills/:id          — delete skill
 * POST   /api/skills/:id/execute  — execute skill
 *
 * Extracted from server.js (lines 1014–1090).
 */

const db = require('../db');
const skills = require('../db/skills');

module.exports = async function handleSkills(req, res) {
  if (req.method === 'GET' && req.url.startsWith('/api/skills')) {
    const enabledOnly = req.url.includes('enabled=true');
    const type = new URLSearchParams(req.url.split('?')[1] || '').get('type');
    const skillsList = await db.crud.listSkills(enabledOnly, type || null);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(skillsList));
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/skills') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { name, description, type, code, config } = JSON.parse(body);
        const result = await skills.createSkill(name, description, type, code, config);
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

  if (req.method === 'PATCH' && req.url.match(/^\/api\/skills\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const updates = JSON.parse(body);
        const result = await skills.updateSkill(id, updates);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  if (req.method === 'DELETE' && req.url.match(/^\/api\/skills\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    const result = await db.crud.deleteSkill(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return true;
  }

  if (req.method === 'POST' && req.url.match(/^\/api\/skills\/(\d+)\/execute$/)) {
    const skillId = parseInt(req.url.split('/')[3]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { input, conversationId, messageId } = JSON.parse(body);
        const result = await skills.executeSkillById(skillId, input, conversationId, messageId);
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
