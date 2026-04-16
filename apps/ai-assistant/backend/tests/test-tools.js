const openrouter = require('./lib/openrouter');
const mcp = require('./mcp');
async function test() {
  const tools = mcp.listToolsForLLM();
  console.log("Tools being sent:", JSON.stringify(tools, null, 2));
  try {
    const res = await openrouter.chatCompletion({
      messages: [{ role: 'user', content: 'What is the weather in Rabat?' }],
      tools
    });
    console.log("Response:", JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
