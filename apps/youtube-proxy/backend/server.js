const http = require('http');
const https = require('https');

const PORT = 3704;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const PAGES = {
  learning: [
    { id: 'UCWX3yGbODI3RREOkRxBEBNQ', name: 'TechWorld with Nana' },
    { id: 'UCW5YeuERMulmmLW1203KW-Q', name: 'NetworkChuck' },
    { id: 'UC9x0AN7BWHpCDHSm9NiJFJQ', name: 'Traversy Media' },
    { id: 'UCddiUEpeqJcYeBxX1IVBKvQ', name: 'The Primeagen' },
    { id: 'UCGWe2JyKDMYJJNMmRd2bBOA', name: 'DevOps Directive' },
  ],
  home: [
    { id: 'UCsBjURrPoezykLs9EqgamOA', name: 'Fireship' },
    { id: 'UCVhQ2NnY5Rskt6UjCUkJ_DA', name: 'Code with Antonio' },
    { id: 'UC8butISFwT-Wl7EV0hUK0BQ', name: 'freeCodeCamp' },
    { id: 'UCW5YeuERMulmmLW1203KW-Q', name: 'NetworkChuck' },
    { id: 'UCWX3yGbODI3RREOkRxBEBNQ', name: 'TechWorld with Nana' },
  ],
  devops: [
    { id: 'UCWX3yGbODI3RREOkRxBEBNQ', name: 'TechWorld with Nana' },
    { id: 'UCddiUEpeqJcYeBxX1IVBKvQ', name: 'The Primeagen' },
    { id: 'UCR-DXc1voovS8nhAvccRZhg', name: 'Jeff Geerling' },
    { id: 'UCGWe2JyKDMYJJNMmRd2bBOA', name: 'DevOps Directive' },
  ],
  content: [
    { id: 'UCsBjURrPoezykLs9EqgamOA', name: 'Fireship' },
    { id: 'UCddiUEpeqJcYeBxX1IVBKvQ', name: 'The Primeagen' },
    { id: 'UCqr-7GDVTsdNBCeufvERYuw', name: 'Kevin Powell' },
    { id: 'UC8butISFwT-Wl7EV0hUK0BQ', name: 'freeCodeCamp' },
  ],
};

const cache = {};

function fetchYouTubeRSS(channelId) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.youtube.com',
      path: `/feeds/videos.xml?channel_id=${channelId}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    };
    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ ok: res.statusCode === 200, data }));
    });
    req.on('error', () => resolve({ ok: false, data: '' }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ ok: false, data: '' }); });
  });
}

function parseXML(xml, channelName) {
  const videos = [];
  const entryRegex = /<entry>(.*?)<\/entry>/gs;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const e = match[1];
    const title = e.match(/<title>(.*?)<\/title>/s)?.[1]?.trim() ?? '';
    const link = e.match(/<link rel="alternate" href="([^"]+)"/)?.[1] ?? '';
    const published = e.match(/<published>(.*?)<\/published>/s)?.[1] ?? '';
    const videoId = e.match(/<yt:videoId>(.*?)<\/yt:videoId>/s)?.[1] ?? '';
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    if (title && videoId) videos.push({ title, link, published, thumbnail, videoId, channelName });
  }
  return videos;
}

async function getVideos(page) {
  const now = Date.now();
  if (cache[page] && now - cache[page].time < CACHE_TTL) {
    return cache[page].data;
  }

  const channels = PAGES[page] || [];
  const allVideos = [];

  for (const channel of channels) {
    const result = await fetchYouTubeRSS(channel.id);
    if (result.ok) {
      allVideos.push(...parseXML(result.data, channel.name));
    }
  }

  const sorted = allVideos
    .sort((a, b) => new Date(b.published) - new Date(a.published))
    .slice(0, 12);

  cache[page] = { time: now, data: sorted };
  return sorted;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const page = req.url?.replace('/', '').split('?')[0];

  if (PAGES[page]) {
    try {
      const videos = await getVideos(page);
      res.writeHead(200);
      res.end(JSON.stringify({ videos }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found', routes: Object.keys(PAGES) }));
  }
});

server.listen(PORT, () => {
  console.log(`YouTube proxy running on port ${PORT}`);
  console.log(`Routes: ${Object.keys(PAGES).map(p => `/${p}`).join(', ')}`);
});
