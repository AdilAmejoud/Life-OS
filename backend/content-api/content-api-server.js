// content-api/server.js
// Life_OS v3 — Content API
// Port: 3950
// Data: /app/data/content-data.json
//
// Endpoints:
//   GET  /api/content/data              → full content-data.json
//   GET  /api/content/analytics         → analytics block
//   GET  /api/content/intelligence      → intelligence block
//   POST /api/content/add-idea          → { text, source }
//   POST /api/content/add-item          → full item object
//   POST /api/content/update-status     → { id, status }
//   POST /api/content/add-from-project  → WF1 integration
//   POST /api/content/update-platform   → { platform, ...metrics }
//   POST /api/content/update-analytics  → { weekly_views, ... }

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.CONTENT_API_PORT || 3950;
const DATA_FILE = path.join(__dirname, 'data', 'content-data.json');

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { return { platforms: {}, items: [], ideas: [], analytics: {}, intelligence: {} }; }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function respond(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const url = req.url.split('?')[0];

  // ─── GET ─────────────────────────────────────────
  if (req.method === 'GET') {
    const data = readData();

    if (url === '/api/content/data') {
      return respond(res, 200, data);
    }

    if (url === '/api/content/analytics') {
      return respond(res, 200, data.analytics || {});
    }

    if (url === '/api/content/platforms-list') {
      const list = Object.entries(data.platforms || {}).map(([id, meta]) => ({
        id,
        ...meta
      }));
      return respond(res, 200, { data: list });
    }

    if (url === '/api/content/pipeline-list') {
      return respond(res, 200, { data: data.items || [] });
    }

    if (url === '/api/content/ideas-list') {
      return respond(res, 200, { data: (data.ideas || []).slice(-10).reverse() });
    }

    if (url === '/api/content/intelligence') {
      return respond(res, 200, data.intelligence || {});
    }

    if (url === '/health') {
      return respond(res, 200, { status: 'ok', service: 'content-api' });
    }

    return respond(res, 404, { error: 'Not found' });
  }

  // ─── POST ────────────────────────────────────────
  if (req.method === 'POST') {
    const body = await readBody(req);
    const data = readData();

    // Add a manual idea
    if (url === '/api/content/add-idea') {
      if (!body.text) return respond(res, 400, { error: 'text required' });
      data.ideas = data.ideas || [];
      data.ideas.push({
        text: body.text,
        source: body.source || 'manual',
        added: new Date().toISOString().slice(0, 10),
      });
      writeData(data);
      return respond(res, 200, { ok: true });
    }

    // Add a full content item
    if (url === '/api/content/add-item') {
      if (!body.title) return respond(res, 400, { error: 'title required' });
      data.items = data.items || [];
      const newItem = {
        id: Date.now().toString(),
        title: body.title,
        type: body.type || 'post',
        platform: body.platform || 'linkedin',
        status: body.status || 'idea',
        source: body.source || 'manual',
        related_project: body.related_project || null,
        publish_date: body.publish_date || null,
        updated: new Date().toISOString().slice(0, 10),
      };
      data.items.push(newItem);
      writeData(data);
      return respond(res, 200, { ok: true, item: newItem });
    }

    // Update status of an item
    if (url === '/api/content/update-status') {
      const item = (data.items || []).find(i => i.id === body.id || i.title === body.title);
      if (!item) return respond(res, 404, { error: 'item not found' });
      item.status = body.status || item.status;
      item.updated = new Date().toISOString().slice(0, 10);
      if (body.linkedinDraft) item.linkedin_draft = body.linkedinDraft;
      writeData(data);
      return respond(res, 200, { ok: true, item });
    }

    // WF1 integration: project evaluated → add to pipeline
    // n8n sends this after scoring a project
    if (url === '/api/content/add-from-project') {
      if (!body.projectName) return respond(res, 400, { error: 'projectName required' });
      data.items = data.items || [];
      data.ideas = data.ideas || [];

      // Add idea for the strongest dimension
      data.ideas.push({
        text: `${body.projectName} — ${body.topDimension || 'technical breakdown'} (score: ${body.score || '?'}/100)`,
        source: 'project',
        added: new Date().toISOString().slice(0, 10),
      });

      // Auto-generate items for LinkedIn + YouTube if score >= 70
      const score = parseInt(body.score || 0);
      if (score >= 70) {
        const platforms = ['linkedin', 'youtube', 'medium'];
        const types = ['post', 'video', 'article'];
        platforms.forEach((platform, i) => {
          data.items.push({
            id: Date.now().toString() + i,
            title: `${body.projectName} — ${platform === 'youtube' ? 'full walkthrough' : platform === 'linkedin' ? 'lessons learned post' : 'deep dive article'}`,
            type: types[i],
            platform,
            status: platform === 'linkedin' && body.linkedinDraft ? 'ready_to_publish' : 'idea',
            source: 'project',
            related_project: body.projectName,
            linkedin_draft: platform === 'linkedin' ? (body.linkedinDraft || null) : null,
            publish_date: null,
            updated: new Date().toISOString().slice(0, 10),
          });
        });
      }

      writeData(data);
      return respond(res, 200, { ok: true, itemsAdded: score >= 70 ? 3 : 0 });
    }

    // Update platform metrics (called by n8n automation or manual)
    if (url === '/api/content/update-platform') {
      if (!body.platform) return respond(res, 400, { error: 'platform required' });
      data.platforms = data.platforms || {};
      data.platforms[body.platform] = {
        ...(data.platforms[body.platform] || {}),
        ...body,
      };
      delete data.platforms[body.platform].platform; // remove redundant key
      writeData(data);
      return respond(res, 200, { ok: true });
    }

    // Update analytics block
    if (url === '/api/content/update-analytics') {
      data.analytics = { ...(data.analytics || {}), ...body };
      writeData(data);
      return respond(res, 200, { ok: true });
    }

    return respond(res, 404, { error: 'Not found' });
  }

  respond(res, 405, { error: 'Method not allowed' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Content API monitoring http://0.0.0.0:${PORT}`);
  console.log(`[content-api] data file: ${DATA_FILE}`);
});
