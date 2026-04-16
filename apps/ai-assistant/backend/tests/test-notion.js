const mcp = require('./mcp');
async function test() {
  const tool = mcp.getTool('notion');
  
  // monkey patch makeRequest to trace
  const originalMakeRequest = mcp.__makeRequestForTesting__; // if we export it, else we can't

  const res = await tool.execute({ action: 'databaseQuery' });
  console.log("Notion db query length:", res.results ? res.results.length : 0);
  console.log("Result object:", JSON.stringify(res, null, 2));
}
test();
