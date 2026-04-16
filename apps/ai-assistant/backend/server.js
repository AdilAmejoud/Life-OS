/**
 * main server.js (Slim entry point)
 * 
 * Re-structured during Phase 3 to import sub-routers.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Infrastructure & Config
const db = require('./db');
const { getModel, OLLAMA_HOST, OLLAMA_PORT } = require('./integrations/ollama');

// Route handlers
const handleChat = require('./routes/chat');
const handleConversations = require('./routes/conversations');
const handleTasks = require('./routes/tasks');
const handleMemory = require('./routes/memory');
const handleModels = require('./routes/models');
const handleTools = require('./routes/tools');
const handleN8n = require('./routes/n8n');
const handleCredentials = require('./routes/credentials');
const handleInstructions = require('./routes/instructions');
const handleSkills = require('./routes/skills');
const handleUserData = require('./routes/userData');
const handleReasoning = require('./routes/reasoning');
const handleMcpExport = require('./routes/mcpExport');
const handleOrchestration = require('./routes/orchestration');

// =====================================================
// FRONTEND BUILD CHECK
// =====================================================
function ensureFrontendBuilt() {
  const frontendPath = path.join(__dirname, 'frontend');
  const distPath = path.join(frontendPath, 'dist');
  const assetsPath = path.join(distPath, 'assets');

  if (fs.existsSync(distPath) && fs.existsSync(assetsPath)) {
    const jsFiles = fs.readdirSync(assetsPath).filter(f => f.endsWith('.js'));
    if (jsFiles.length > 0) {
      console.log('Frontend already built, skipping build step');
      return;
    }
  }

  console.log('Building frontend...');
  try {
    const nodeModulesPath = path.join(frontendPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('Installing frontend dependencies...');
      execSync('npm install', { cwd: frontendPath, stdio: 'inherit' });
    }
    execSync('npm run build', { cwd: frontendPath, stdio: 'inherit' });
    console.log('Frontend build complete');
  } catch (error) {
    console.error('Failed to build frontend:', error.message);
  }
}

// Build frontend on startup
ensureFrontendBuilt();
const PORT = 3700;

// Database initialization
async function initServer() {
  try {
    // Reverted db init call since db.js became db/index.js (so the path changed but method should be available, it's actually db.init() )
    if (db.init) {
      await db.init();
    } else if (db.crud && db.crud.init) {
      await db.crud.init();
    }
    console.log('Database initialized');
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  }
}

// =====================================================
// SERVER INSTANCE
// =====================================================
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 1. Static file serving (Frontend)
  const frontendDistPath = path.join(__dirname, 'frontend', 'dist');
  const urlPathRaw = (req.url || '/').split('?')[0];
  const urlPath = (() => {
    try { return decodeURIComponent(urlPathRaw); } catch { return urlPathRaw; }
  })();

  const resolvedPath = (() => {
    const rel = urlPath === '/' || urlPath === '/index.html' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const normalized = path.normalize(rel);
    return path.join(frontendDistPath, normalized);
  })();

  const filePath = (resolvedPath.startsWith(frontendDistPath + path.sep) || resolvedPath === path.join(frontendDistPath, 'index.html'))
    ? resolvedPath : null;

  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
      '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpg',
      '.gif': 'image/gif', '.svg': 'image/svg+xml', '.wav': 'audio/wav',
      '.mp4': 'video/mp4', '.woff': 'application/font-woff', '.ttf': 'application/font-ttf',
      '.eot': 'application/vnd.ms-fontobject', '.otf': 'application/font-otf', '.wasm': 'application/wasm'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
    return;
  }

  // 2. SPA catch-all
  if (req.method === 'GET' && !req.url.startsWith('/api/') && req.url !== '/health') {
    const indexHtml = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexHtml)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(indexHtml));
      return;
    }
  }

  // 3. Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      model: getModel(),
      database: 'connected',
      n8n: 'configured'
    }));
    return;
  }

  // 4. Delegate to sub-routers
  try {
    if (await handleModels(req, res)) return;
    if (await handleChat(req, res)) return;
    if (await handleConversations(req, res)) return;
    if (await handleTasks(req, res)) return;
    if (await handleMemory(req, res)) return;
    if (await handleTools(req, res)) return;
    if (await handleN8n(req, res)) return;
    if (await handleCredentials(req, res)) return;
    if (await handleInstructions(req, res)) return;
    if (await handleSkills(req, res)) return;
    if (await handleUserData(req, res)) return;
    if (await handleReasoning(req, res)) return;
    if (await handleMcpExport(req, res)) return;
    if (await handleOrchestration(req, res)) return;
    
    // If no route matched
    if (!res.headersSent) {
      res.writeHead(404);
      res.end();
    }
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Routing Error: ' + err.message }));
    }
  }
});

// Start server
initServer().then(() => {
  server.listen(PORT, () => {
    console.log(`AI Assistant running on port ${PORT}`);
    console.log(`Model: ${getModel()} @ ${OLLAMA_HOST}:${OLLAMA_PORT}`);
    console.log('Database: SQLite (schema v2)');
    console.log('n8n: configured');
    console.log('MCP: skills + 5 tools available');
    console.log('Instructions: enabled');
    console.log('User Data: enabled');
  });
});
