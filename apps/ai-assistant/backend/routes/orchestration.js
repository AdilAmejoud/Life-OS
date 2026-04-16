/**
 * routes/orchestration.js
 * POST /api/tools/orchestrate — run tool chains or parallel tools
 *
 * Extracted from server.js (lines 1274–1314).
 */

const orchestrator = require('../core/orchestrator');
const mcp = require('../integrations/mcp');

module.exports = async function handleOrchestration(req, res) {
  if (req.method === 'POST' && req.url === '/api/tools/orchestrate') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { request, method = 'chain' } = JSON.parse(body);

        let result;
        if (method === 'chain') {
          // Simple chain - web search, then process
          const searchResult = await mcp.executeTool('web_search', [request]);
          result = orchestrator.createOrchestrationPlan([
            { tool: 'web_search', args: [request], description: `Search for "${request}"` }
          ]);
          result.searchResult = searchResult;
        } else if (method === 'parallel') {
          // Run multiple tools in parallel
          result = await orchestrator.parallelTools([
            { tool: 'web_search', args: [request] },
            { tool: 'calculator', args: [] },
            { tool: 'weather', args: ['Rabat'] }
          ]);
        } else {
          result = await orchestrator.chainTools([
            { tool: 'web_search', args: [request], useInput: true }
          ], request);
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

  return false;
};
