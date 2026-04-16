/**
 * routes/tools.js
 * GET  /api/tools            — list all tools (MCP + n8n)
 * GET  /api/mcp/tools        — list MCP tools
 * POST /api/mcp/execute      — execute an MCP tool by name
 * POST /api/tools/execute    — unified tool execution (github, gmail, gcal, etc.)
 * GET  /api/tools/status     — tool + credentials status
 * POST /api/mcp/relevant     — find relevant MCP tool for a request
 *
 * Extracted from server.js (lines 180–188, 681–774).
 */

const mcp = require('../integrations/mcp');
const n8n = require('../integrations/n8n');
const db = require('../db');

module.exports = async function handleTools(req, res) {
  // Get available tools (all)
  if (req.method === 'GET' && req.url === '/api/tools') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      mcp: mcp.listTools(),
      n8n: await n8n.listWorkflows()
    }));
    return true;
  }

  if (req.method === 'GET' && req.url === '/api/mcp/tools') {
    const tools = mcp.listTools();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tools));
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/mcp/execute') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { name, args } = JSON.parse(body);
        const result = await mcp.executeTool(name, ...(args || []));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  // =====================================================
  // Tools Endpoints (Unified interface for all tools)
  // =====================================================
  if (req.method === 'POST' && req.url === '/api/tools/execute') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { name, action, params } = JSON.parse(body);
        let result;

        if (name === 'github') {
          result = await mcp.executeTool('github', { action, ...params });
        } else if (name === 'gmail') {
          result = await mcp.executeTool('gmail', { action, ...params });
        } else if (name === 'gcal') {
          result = await mcp.executeTool('gcal', { action, ...params });
        } else if (name === 'fileSystem') {
          result = await mcp.executeTool('fileSystem', { action, ...params });
        } else {
          result = await mcp.executeTool(name, ...(params || []));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  if (req.method === 'GET' && req.url === '/api/tools/status') {
    const tools = mcp.listTools();
    // Check which services have credentials configured
    const serviceNames = ['github', 'gmail', 'gcal', 'notion'];
    const allCreds = await db.crud.listCredentials();
    const status = serviceNames.map(service => {
      const hasCreds = allCreds.some(c => c.service === service);
      return {
        service,
        enabled: tools.some(t => t.name === service) && tools.find(t => t.name === service)?.enabled !== false,
        connected: hasCreds
      };
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tools, services: status }));
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/mcp/relevant') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { request } = JSON.parse(body);
        const relevant = mcp.findRelevantTool(request);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ relevant }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  return false;
};
