#!/usr/bin/env node
/**
 * Pomodoro Timer Server
 * Serves the Pomodoro timer HTML page for the Life_OS dashboard
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3800;
const ROOT = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let urlPath = req.url?.split('?')[0] ?? '/';
  if (urlPath === '') urlPath = '/';

  // Serve static files from dist (e.g. /assets/index-xxx.js)
  let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.access(resolvedPath, fs.constants.R_OK, (err) => {
    if (err) {
      // SPA fallback: unknown paths (e.g. /tasks) serve index.html for client-side routing
      fs.readFile(path.join(ROOT, 'index.html'), (readErr, content) => {
        if (readErr) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff'
        });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(resolvedPath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Pomodoro Timer server running at http://localhost:${PORT}`);
  console.log(`Pomodoro page will be available at http://localhost:${PORT}/`);
});

module.exports = server;
