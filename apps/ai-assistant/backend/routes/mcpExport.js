/**
 * routes/mcpExport.js
 * GET  /api/tools/export      — export skills as MCP JSON
 * POST /api/tools/import      — import skills from MCP JSON
 * GET  /api/tools/export/json — export as raw JSON string
 *
 * Extracted from server.js (lines 1238–1272).
 */

const mcpExport = require('../integrations/mcp-export');

module.exports = async function handleMcpExport(req, res) {
  if (req.method === 'GET' && req.url === '/api/tools/export/json') {
    const enabledOnly = req.url.includes('enabled=true');
    const json = await mcpExport.exportSkillsAsJSON(enabledOnly);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(json);
    return true;
  }

  if (req.method === 'GET' && req.url === '/api/tools/export') {
    const enabledOnly = req.url.includes('enabled=true');
    const mcpData = await mcpExport.exportSkillsAsMCP(enabledOnly);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mcpData));
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/tools/import') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { data } = JSON.parse(body);
        const result = await mcpExport.importSkillsFromMCP(data);
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
