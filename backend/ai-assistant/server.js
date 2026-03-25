const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load modules
const db = require('./db');
const systemPrompt = require('./systemPrompt');
const n8n = require('./n8n');
const tasks = require('./tasks');
const mcp = require('./mcp');
const skills = require('./skills');
const instructions = require('./instructions');
const userData = require('./userData');
const mcpExport = require('./mcp-export');
const orchestrator = require('./orchestrator');
const reasoning = require('./reasoning');
const webSearch = require('./webSearch');

// Configuration
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'host.docker.internal';
const OLLAMA_PORT = parseInt(process.env.OLLAMA_PORT || '11434');
let MODEL = process.env.OLLAMA_MODEL || 'qwen3:4b';
const NOTION_TOKEN = process.env.NOTION_TOKEN || '';
const SECTIONS_DB = process.env.SECTIONS_DB || '2466914a68328083a576cc791fb27c2e';
const PORT = 3700;

// Database initialization
async function initServer() {
  try {
    await db.init();
    console.log('Database initialized');
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  }
}

// Default system prompt
const SYSTEM_PROMPT = `You are Adil's personal AI assistant. Be direct and concise.

Adil is a software engineer in training based in Rabat, Morocco.
He runs CoderVerse (YouTube + Instagram) — a programming education channel.
He is currently in Phase 1 (Coding - Introduction) at 45% progress.
His goal: become a Software Engineer in 1 year while growing CoderVerse.
He also builds n8n automation workflows (Smart Control System).
Respond in the same language the user uses (Arabic or English).`;

// =====================================================
// API ENDPOINTS
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

  // Serve index.html
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      model: MODEL,
      database: 'connected',
      n8n: 'configured'
    }));
    return;
  }

  // Get available tools
  if (req.method === 'GET' && req.url === '/api/tools') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      mcp: mcp.listTools(),
      n8n: await n8n.listWorkflows()
    }));
    return;
  }

  // List available Ollama models
  if (req.method === 'GET' && req.url === '/api/models') {
    try {
      const modelsData = await new Promise((resolve, reject) => {
        const req = http.request({ hostname: OLLAMA_HOST, port: OLLAMA_PORT, path: '/api/tags', method: 'GET' }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
        });
        req.on('error', reject);
        req.end();
      });
      const models = (modelsData.models || []).map(m => ({
        name: m.name,
        size: m.size,
        modified_at: m.modified_at,
        family: m.details?.family || '',
        parameter_size: m.details?.parameter_size || ''
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ current: MODEL, models }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Switch active model
  if (req.method === 'POST' && req.url === '/api/models/switch') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { model } = JSON.parse(body);
        if (!model) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'model is required' }));
          return;
        }
        MODEL = model;
        console.log(`Model switched to: ${MODEL}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, model: MODEL }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Web Search endpoint
  if (req.method === 'GET' && req.url.startsWith('/api/search?')) {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const query = params.get('q');
    if (!query) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'q parameter required' }));
      return;
    }
    try {
      const results = await webSearch.search(query, 5);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ query, results }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // =====================================================
  // Chat Endpoint - Enhanced with memory, context, instructions, reasoning
  // =====================================================
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { messages, includeNotion, includeMcpTools, conversationId, reasoningMode, webSearchEnabled } = JSON.parse(body);

        // Get or create conversation
        let convId = conversationId;
        if (!convId) {
          const conv = await db.crud.createConversation(
            `Chat ${new Date().toLocaleDateString()}`,
            MODEL
          );
          convId = conv.id;
        } else {
          await db.crud.updateConversation(convId, { updated_at: new Date().toISOString() });
        }

        // Build system prompt with context
        let systemContent = SYSTEM_PROMPT;

        // Inject active instructions into prompt
        try {
          const activeInstructions = await instructions.getActiveInstructions();
          if (Array.isArray(activeInstructions) && activeInstructions.length > 0) {
            systemContent += '\n\n## Active Instructions\n';
            activeInstructions.forEach(inst => {
              systemContent += `- [${inst.category || 'general'}] ${inst.content}\n`;
            });
          }
        } catch (e) { /* instructions not critical */ }

        // Inject user profile data into prompt
        try {
          const userDataList = await userData.listUserData();
          if (Array.isArray(userDataList) && userDataList.length > 0) {
            systemContent += '\n\n## Known Facts About Adil\n';
            const grouped = {};
            userDataList.forEach(d => {
              if (!grouped[d.category]) grouped[d.category] = [];
              grouped[d.category].push(`${d.key}: ${d.value}`);
            });
            Object.entries(grouped).forEach(([cat, items]) => {
              systemContent += `### ${cat}\n${items.map(i => `- ${i}`).join('\n')}\n`;
            });
          }
        } catch (e) { /* user data not critical */ }

        if (includeNotion && NOTION_TOKEN) {
          const notionData = await queryNotion();
          if (notionData) {
            systemContent += `\n\nLive learning plan:\n${notionData}`;
          }
        }

        // Web search integration
        let searchResults = null;
        if (webSearchEnabled && messages.length > 0) {
          const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
          if (lastUserMsg) {
            try {
              const results = await webSearch.search(lastUserMsg.content, 5);
              if (results.length > 0) {
                searchResults = results;
                systemContent += '\n\n' + webSearch.formatForPrompt(results, lastUserMsg.content);
              }
            } catch (e) { /* search not critical */ }
          }
        }

        // Get conversation history
        let history = await db.crud.getMessageHistory(convId);
        if (!history) history = [];

        // Add current messages to history
        for (const msg of messages) {
          history.push(msg);
          await db.crud.createMessage(convId, msg.role, msg.content);
        }

        // Extract tasks from user message if enabled
        if (history.length > 0) {
          const lastUserMsg = history[history.length - 1];
          if (lastUserMsg.role === 'user') {
            const shouldExtract = await systemPrompt.shouldExtractTask(lastUserMsg.content);
            if (shouldExtract) {
              const extractedTasks = await tasks.createTaskFromMessage(
                lastUserMsg.content,
                convId,
                history.length
              );
              if (extractedTasks.length > 0) {
                systemContent += `\n\nExtracted tasks from your message:\n${extractedTasks.map(t => `- [${t.status}] ${t.title}`).join('\n')}`;
              }
            }
          }
        }

        // MCP tools context
        if (includeMcpTools) {
          const mcpTools = mcp.listTools();
          if (mcpTools.length > 0) {
            systemContent += `\n\nAvailable tools:\n${mcpTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`;
          }
        }

        // Apply reasoning mode to the last user message
        let userMessages = messages.slice(-10);
        if (reasoningMode && reasoningMode !== 'none' && userMessages.length > 0) {
          const lastMsg = userMessages[userMessages.length - 1];
          if (lastMsg.role === 'user') {
            const reasoningPrompt = reasoning.buildReasoningPrompt(lastMsg.content, reasoningMode);
            userMessages[userMessages.length - 1] = { role: 'user', content: reasoningPrompt };
          }
        }

        const fullMessages = [
          { role: 'system', content: systemContent },
          ...userMessages
        ];

        // Query Ollama
        const reply = await chatWithOllama(fullMessages);

        // Save assistant response
        await db.crud.createMessage(convId, 'assistant', reply);

        // Save learned facts
        const facts = await systemPrompt.extractFactsFromConversation(messages);
        await systemPrompt.saveLearnedFacts(facts);

        // Extract and save user data with confidence
        try {
          const extractedData = await systemPrompt.extractUserDataWithConfidence(messages);
          if (Array.isArray(extractedData)) {
            await systemPrompt.saveLearnedUserData(extractedData);
          }
        } catch (e) { /* user data extraction not critical */ }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          reply,
          conversationId: convId,
          tasks: []
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // =====================================================
  // Streaming Chat Endpoint (SSE)
  // =====================================================
  if (req.method === 'POST' && req.url === '/api/chat/stream') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { messages, includeNotion, includeMcpTools, conversationId, reasoningMode, webSearchEnabled } = JSON.parse(body);

        let convId = conversationId;
        if (!convId) {
          const conv = await db.crud.createConversation(`Chat ${new Date().toLocaleDateString()}`, MODEL);
          convId = conv.id;
        } else {
          await db.crud.updateConversation(convId, { updated_at: new Date().toISOString() });
        }

        // Build system prompt (same as non-streaming)
        let systemContent = SYSTEM_PROMPT;
        try {
          const activeInstructions = await instructions.getActiveInstructions();
          if (Array.isArray(activeInstructions) && activeInstructions.length > 0) {
            systemContent += '\n\n## Active Instructions\n';
            activeInstructions.forEach(inst => {
              systemContent += `- [${inst.category || 'general'}] ${inst.content}\n`;
            });
          }
        } catch (e) { }
        try {
          const userDataList = await userData.listUserData();
          if (Array.isArray(userDataList) && userDataList.length > 0) {
            systemContent += '\n\n## Known Facts About Adil\n';
            userDataList.forEach(d => { systemContent += `- ${d.key}: ${d.value}\n`; });
          }
        } catch (e) { }

        // Web search for streaming
        if (webSearchEnabled && messages.length > 0) {
          const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
          if (lastUserMsg) {
            try {
              const results = await webSearch.search(lastUserMsg.content, 5);
              if (results.length > 0) {
                systemContent += '\n\n' + webSearch.formatForPrompt(results, lastUserMsg.content);
              }
            } catch (e) { /* search not critical */ }
          }
        }

        for (const msg of messages) {
          await db.crud.createMessage(convId, msg.role, msg.content);
        }

        let userMessages = messages.slice(-10);
        if (reasoningMode && reasoningMode !== 'none' && userMessages.length > 0) {
          const lastMsg = userMessages[userMessages.length - 1];
          if (lastMsg.role === 'user') {
            userMessages[userMessages.length - 1] = {
              role: 'user',
              content: reasoning.buildReasoningPrompt(lastMsg.content, reasoningMode)
            };
          }
        }

        const fullMessages = [{ role: 'system', content: systemContent }, ...userMessages];

        // SSE headers
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });

        // Send conversationId immediately
        res.write(`data: ${JSON.stringify({ type: 'meta', conversationId: convId })}\n\n`);

        // Stream from Ollama
        await streamFromOllama(fullMessages, res, convId);

      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        } else {
          res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
          res.end();
        }
      }
    });
    return;
  }

  // =====================================================
  // Conversations Endpoints
  // =====================================================
  if (req.method === 'GET' && req.url === '/api/conversations') {
    const conversations = await db.crud.listConversations(50);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(conversations));
    return;
  }

  if (req.method === 'GET' && req.url.match(/^\/api\/conversations\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    const messages = await db.crud.getMessages(id, 100);
    const conversation = await db.crud.getConversation(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ conversation, messages }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/conversations') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { title, model } = JSON.parse(body);
        const conv = await db.crud.createConversation(title || 'New Chat', model || MODEL);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(conv));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'DELETE' && req.url.match(/^\/api\/conversations\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    await db.crud.deleteConversation(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // =====================================================
  // Tasks Endpoints
  // =====================================================
  if (req.method === 'GET' && req.url === '/api/tasks') {
    const status = req.url.split('?').length > 1 ? new URLSearchParams(req.url.split('?')[1]).get('status') : null;
    const result = await tasks.getTasks({ status });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/tasks') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { conversationId, messageId, title, description, priority, dueDate } = JSON.parse(body);
        const task = await tasks.createTaskFromMessage(
          title || 'Task',
          conversationId,
          messageId
        );
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(task));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'PATCH' && req.url.match(/^\/api\/tasks\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { status } = JSON.parse(body);
        const result = await tasks.updateTaskStatus(id, status);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'DELETE' && req.url.match(/^\/api\/tasks\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    await tasks.deleteTask(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // =====================================================
  // Memory Endpoints
  // =====================================================
  if (req.method === 'GET' && req.url === '/api/memory') {
    const type = req.url.split('?').length > 1 ? new URLSearchParams(req.url.split('?')[1]).get('type') : null;
    const result = await db.crud.listMemory(type);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/memory') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { type, key, value } = JSON.parse(body);
        const result = await db.crud.setMemory(type, key, value);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // =====================================================
  // Extract Tasks Endpoint
  // =====================================================
  if (req.method === 'POST' && req.url === '/api/extract-tasks') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message, conversationId, messageId } = JSON.parse(body);
        const extracted = await tasks.extractTasksFromMessage(message);
        const created = await tasks.createTaskFromMessage(message, conversationId, messageId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ extracted, created }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // =====================================================
  // MCP Tools Endpoints
  // =====================================================
  if (req.method === 'GET' && req.url === '/api/mcp/tools') {
    const tools = mcp.listTools();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tools));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/mcp/execute') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { name, args } = JSON.parse(body);
        const result = await mcp.executeTool(name, ...(args || []));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/mcp/relevant') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { request } = JSON.parse(body);
        const relevant = mcp.findRelevantTool(request);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ relevant }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // =====================================================
  // n8n Endpoints
  // =====================================================
  if (req.method === 'GET' && req.url === '/api/n8n/status') {
    const status = await n8n.testConnection();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/n8n/workflows') {
    const workflows = await n8n.listWorkflows();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(workflows));
    return;
  }

  if (req.method === 'POST' && req.url.match(/^\/api\/n8n\/trigger\/(.+)$/)) {
    const workflowId = req.url.split('/')[5];
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { payload } = JSON.parse(body);
        const result = await n8n.triggerWorkflow(workflowId, payload || {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/n8n/maybe-trigger') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);
        const result = await n8n.maybeTriggerWorkflow(message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Get connected (saved) workflows from local DB
  if (req.method === 'GET' && req.url === '/api/n8n/connected') {
    try {
      const connected = await db.crud.listWorkflows();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(connected));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Connect a workflow (save to local DB)
  if (req.method === 'POST' && req.url === '/api/n8n/connect') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { workflowId, name, webhookUrl } = JSON.parse(body);
        if (!workflowId || !name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'workflowId and name are required' }));
          return;
        }
        const result = await db.crud.saveWorkflow(workflowId, name, webhookUrl || '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Disconnect a workflow (remove from local DB)
  if (req.method === 'DELETE' && req.url.match(/^\/api\/n8n\/disconnect\/(.+)$/)) {
    const workflowId = req.url.split('/')[4];
    try {
      const result = await db.crud.deleteWorkflow(workflowId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // =====================================================
  // Instructions Endpoints
  // =====================================================
  if (req.method === 'GET' && req.url === '/api/instructions') {
    const enabledOnly = req.url.includes('enabled=true');
    const instructionsList = await instructions.listInstructions(!enabledOnly);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(instructionsList));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/instructions/active') {
    const activeInstructions = await instructions.getActiveInstructions();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(activeInstructions));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/instructions') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { name, content, category, priority } = JSON.parse(body);
        const result = await instructions.createInstruction(name, content, category, priority);
        if (result.error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'DELETE' && req.url.match(/^\/api\/instructions\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    const result = await instructions.deleteInstruction(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (req.method === 'PATCH' && req.url.match(/^\/api\/instructions\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const updates = JSON.parse(body);
        const result = await instructions.updateInstruction(id, updates);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // =====================================================
  // Skills Endpoints
  // =====================================================
  if (req.method === 'GET' && req.url === '/api/skills') {
    const enabledOnly = req.url.includes('enabled=true');
    const type = new URLSearchParams(req.url.split('?')[1]).get('type');
    const skillsList = await db.crud.listSkills(enabledOnly, type || null);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(skillsList));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/skills') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { name, description, type, code, config } = JSON.parse(body);
        const result = await skills.createSkill(name, description, type, code, config);
        if (result.error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'PATCH' && req.url.match(/^\/api\/skills\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const updates = JSON.parse(body);
        const result = await skills.updateSkill(id, updates);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'DELETE' && req.url.match(/^\/api\/skills\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    const result = await db.crud.deleteSkill(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (req.method === 'POST' && req.url.match(/^\/api\/skills\/(\d+)\/execute$/)) {
    const skillId = parseInt(req.url.split('/')[3]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { input, conversationId, messageId } = JSON.parse(body);
        const result = await skills.executeSkillById(skillId, input, conversationId, messageId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // =====================================================
  // User Data Endpoints
  // =====================================================
  if (req.method === 'GET' && req.url === '/api/user-data') {
    const category = new URLSearchParams(req.url.split('?')[1]).get('category');
    const userDataList = await userData.listUserData(category || null);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(userDataList));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/user-data/profile') {
    const profile = await systemPrompt.getUserProfile();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(profile));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/user-data') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { category, key, value, confidence } = JSON.parse(body);
        const result = await userData.storeUserData({ category, key, value, confidence });
        if (result.error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'DELETE' && req.url.match(/^\/api\/user-data\/([^/]+)\/([^/]+)$/)) {
    const category = decodeURIComponent(req.url.split('/')[3]);
    const key = decodeURIComponent(req.url.split('/')[4]);
    const result = await userData.deleteUserDataItem(category, key);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // =====================================================
  // Reasoning Endpoints
  // =====================================================
  if (req.method === 'POST' && req.url === '/api/reasoning') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { mode, message, context } = JSON.parse(body);
        const reasoningMode = mode || 'basic';

        // Validate mode
        const validModes = ['none', 'basic', 'deep', 'reflective'];
        if (!validModes.includes(reasoningMode)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Invalid mode. Use: ${validModes.join(', ')}` }));
          return;
        }

        const prompt = reasoning.buildReasoningPrompt(message, reasoningMode, context);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ prompt, mode: reasoningMode }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // =====================================================
  // MCP Export/Import Endpoints
  // =====================================================
  if (req.method === 'GET' && req.url === '/api/tools/export') {
    const enabledOnly = req.url.includes('enabled=true');
    const mcpData = await mcpExport.exportSkillsAsMCP(enabledOnly);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mcpData));
    return;
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
    return;
  }

  if (req.method === 'GET' && req.url === '/api/tools/export/json') {
    const enabledOnly = req.url.includes('enabled=true');
    const json = await mcpExport.exportSkillsAsJSON(enabledOnly);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(json);
    return;
  }

  // =====================================================
  // Tool Orchestration Endpoints
  // =====================================================
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
    return;
  }

  // =====================================================
  // Notion Integration
  // =====================================================
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

  async function chatWithOllama(messages) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2048,
          num_ctx: 4096
        }
      });
      const options = {
        hostname: OLLAMA_HOST,
        port: OLLAMA_PORT,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.error) return reject(new Error(json.error));
            const content = json.message?.content;
            if (!content || content.trim() === '') {
              return resolve('(empty response from model)');
            }
            resolve(content);
          } catch { reject(new Error('Parse error: ' + body.slice(0, 200))); }
        });
      });
      req.setTimeout(120000, () => {
        req.destroy();
        reject(new Error('Request timeout after 120s'));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  // Streaming chat with Ollama (SSE)
  async function streamFromOllama(messages, clientRes, convId) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
        options: {
          temperature: 0.7,
          num_predict: 2048,
          num_ctx: 4096
        }
      });
      const options = {
        hostname: OLLAMA_HOST,
        port: OLLAMA_PORT,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      let fullContent = '';
      const ollamaReq = http.request(options, (ollamaRes) => {
        ollamaRes.on('data', chunk => {
          const lines = chunk.toString().split('\n').filter(l => l.trim());
          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.message?.content) {
                fullContent += json.message.content;
                clientRes.write(`data: ${JSON.stringify({ type: 'token', content: json.message.content })}\n\n`);
              }
              if (json.done) {
                // Save full message to DB
                db.crud.createMessage(convId, 'assistant', fullContent).catch(() => { });
                clientRes.write(`data: ${JSON.stringify({ type: 'done', content: fullContent })}\n\n`);
                clientRes.end();
                resolve(fullContent);
              }
            } catch (e) { /* skip unparseable lines */ }
          }
        });
        ollamaRes.on('error', (err) => {
          clientRes.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
          clientRes.end();
          reject(err);
        });
      });
      ollamaReq.setTimeout(120000, () => {
        ollamaReq.destroy();
        clientRes.write(`data: ${JSON.stringify({ type: 'error', error: 'Timeout after 120s' })}\n\n`);
        clientRes.end();
        reject(new Error('Timeout'));
      });
      ollamaReq.on('error', (err) => {
        clientRes.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
        clientRes.end();
        reject(err);
      });
      ollamaReq.write(data);
      ollamaReq.end();
    });
  }

  res.writeHead(404);
  res.end();
});

// Start server
initServer().then(() => {
  server.listen(PORT, () => {
    console.log(`AI Assistant running on port ${PORT}`);
    console.log(`Model: ${MODEL} @ ${OLLAMA_HOST}:${OLLAMA_PORT}`);
    console.log('Database: SQLite (schema v2)');
    console.log('n8n: configured');
    console.log('MCP: skills + 5 tools available');
    console.log('Instructions: enabled');
    console.log('User Data: enabled');
  });
});
