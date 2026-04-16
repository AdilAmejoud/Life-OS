/**
 * integrations/notion.js
 * Extracted from server.js — inline queryNotion() function.
 * Queries Adil's learning plan from the Notion database.
 */

const https = require('https');

const NOTION_TOKEN = process.env.NOTION_TOKEN || '';
const SECTIONS_DB = process.env.SECTIONS_DB || '2466914a68328083a576cc791fb27c2e';

async function queryNotion() {
  if (!NOTION_TOKEN) return null;
  return new Promise((resolve) => {
    const data = JSON.stringify({});
    const options = {
      hostname: 'api.notion.com',
      path: `/v1/databases/${SECTIONS_DB}/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.results) {
            const phases = json.results.map(p => {
              const props = p.properties;
              const name = props['Phases']?.title?.[0]?.plain_text ?? '';
              const status = props['Status']?.status?.name ?? 'Not Started';
              const cpRaw = props['Completion Percentage']?.formula?.string ?? '';
              const match = cpRaw.match(/(\d+)%/);
              const progress = match ? parseInt(match[1]) : 0;
              const end_date = props['End Date']?.date?.start ?? '';
              return `${name}: ${status} (${progress}%) ends ${end_date}`;
            });
            resolve(phases.join('\n'));
          } else resolve(null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

module.exports = { queryNotion, NOTION_TOKEN, SECTIONS_DB };
