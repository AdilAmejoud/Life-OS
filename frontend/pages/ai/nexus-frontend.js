// nexus-frontend.js — Launch the AI frontend with NEXUS backend proxy
// Usage: node nexus-frontend.js
// Opens the AI frontend on port 3001, proxying all /api/* to NEXUS on port 3850

const { createServer } = require('http');
const { createProxyServer } = (() => {
  try {
    return require('http-proxy');
  } catch {
    return null;
  }
})();

const BACKEND_PORT = process.env.BACKEND_PORT || '3850';
const FRONTEND_PORT = process.env.FRONTEND_PORT || '3001';

// If http-proxy is not available, use a simple fetch-based proxy
function createSimpleProxy() {
  return {
    web: async (req, res, { target }) => {
      const url = `${target}${req.url}`;
      try {
        const fetchRes = await fetch(url, {
          method: req.method,
          headers: { ...req.headers, host: undefined },
          body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
        });
        const body = await fetchRes.text();
        const headers = {};
        fetchRes.headers.forEach((v, k) => { headers[k] = v; });
        res.writeHead(fetchRes.status, headers);
        res.end(body);
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Proxy error: ${err.message}` }));
      }
    }
  };
}

const proxy = createProxyServer ? createProxyServer() : createSimpleProxy();

const server = createServer((req, res) => {
  // Proxy all API and health requests to NEXUS backend
  if (req.url.startsWith('/api/') || req.url === '/health' || req.url.startsWith('/health')) {
    proxy.web(req, res, { target: `http://localhost:${BACKEND_PORT}` });
    return;
  }

  // Serve static files from the AI frontend dist
  const fs = require('fs');
  const path = require('path');
  const distDir = path.join(__dirname, 'dist');
  let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
      '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(fs.readFileSync(filePath));
    return;
  }

  // SPA fallback
  const indexHtml = path.join(distDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(indexHtml));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found — run `npm run build` first');
});

server.listen(FRONTEND_PORT, () => {
  console.log(`NEXUS Frontend: http://localhost:${FRONTEND_PORT}`);
  console.log(`Proxying /api/* and /health → http://localhost:${BACKEND_PORT} (NEXUS)`);
  console.log(`ai-assistant on port 3700 is untouched`);
});
