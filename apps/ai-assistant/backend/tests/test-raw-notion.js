const mcp = require('./mcp');
const https = require('https');
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const SECTIONS_DB = process.env.SECTIONS_DB || '2466914a68328083a576cc791fb27c2e';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', (e) => reject(e));
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function test() {
  const data = await makeRequest(`https://api.notion.com/v1/databases/${SECTIONS_DB}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28'
    },
    body: {}
  });
  
  if (data.results && data.results.length > 0) {
    const props = Object.keys(data.results[0].properties);
    console.log("Property keys:", props);
    console.log("\nFirst item full properties:\n", JSON.stringify(data.results[0].properties, null, 2));
  } else {
    console.log("No results or error:", JSON.stringify(data));
  }
}
test();
