/**
 * routes/chat.js
 * POST /api/chat         — non-streaming chat
 * POST /api/chat/stream  — SSE streaming chat
 *
 * Extracted from server.js (lines 265–528).
 */

const db = require('../db');
const systemPrompt = require('../context/systemPrompt');
const instructions = require('../context/instructions');
const userData = require('../context/userData');
const webSearch = require('../integrations/webSearch');
const reasoning = require('../core/reasoning');
const openrouter = require('../integrations/openrouter');
const { toolCallingLoop, toolCallingLoopStream } = require('../lib/toolLoop');
const { chatWithOllama, streamFromOllama, generateChatTitle, getModel } = require('../integrations/ollama');
const { queryNotion, NOTION_TOKEN } = require('../integrations/notion');

const SYSTEM_PROMPT = `You are Adil's personal AI assistant. Be direct and concise.

Adil is a software engineer in training based in Rabat, Morocco.
He runs CoderVerse (YouTube + Instagram) — a programming education channel.
He is currently in Phase 1 (Coding - Introduction) at 45% progress.
His goal: become a Software Engineer in 1 year while growing CoderVerse.
He also builds n8n automation workflows (Smart Control System).
Respond in the same language the user uses (Arabic or English).`;

module.exports = async function handleChat(req, res) {
  // =====================================================
  // Chat Endpoint - Enhanced with memory, context, instructions, reasoning
  // =====================================================
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { messages, includeNotion, includeMcpTools = true, conversationId, reasoningMode, webSearchEnabled } = JSON.parse(body);

        // Get or create conversation
        let convId = conversationId;
        if (!convId) {
          let chatTitle = `Chat ${new Date().toLocaleDateString()}`;
          const firstUserMsg = messages.find(m => m.role === 'user');
          if (firstUserMsg && firstUserMsg.content) {
            chatTitle = await generateChatTitle(firstUserMsg.content);
          }
          const conv = await db.crud.createConversation(chatTitle, getModel());
          convId = conv.id;
        } else {
          await db.crud.updateConversation(convId, { updated_at: new Date().toISOString() });
        }

        // Build system prompt with context
        let systemContent = SYSTEM_PROMPT;

        // Inject active instructions
        try {
          const activeInstructions = await instructions.getActiveInstructions();
          if (Array.isArray(activeInstructions) && activeInstructions.length > 0) {
            systemContent += '\n\n## Active Instructions\n';
            activeInstructions.forEach(inst => {
              systemContent += `- [${inst.category || 'general'}] ${inst.content}\n`;
            });
          }
        } catch (e) { /* not critical */ }

        // Inject user profile
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
        } catch (e) { /* not critical */ }

        if (includeNotion && NOTION_TOKEN) {
          const notionData = await queryNotion();
          if (notionData) systemContent += `\n\nLive learning plan:\n${notionData}`;
        }

        // Pre-search enrichment (manual web search mode)
        if (webSearchEnabled && messages.length > 0) {
          const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
          if (lastUserMsg) {
            try {
              const results = await webSearch.search(lastUserMsg.content, 5);
              if (results.length > 0) systemContent += '\n\n' + webSearch.formatForPrompt(results, lastUserMsg.content);
            } catch (e) { /* not critical */ }
          }
        }

        // Persist user messages
        for (const msg of messages) {
          await db.crud.createMessage(convId, msg.role, msg.content);
        }

        // Apply reasoning mode
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

        const fullMessages = [
          { role: 'system', content: systemContent },
          ...userMessages
        ];

        let reply;
        let toolSteps = [];

        // ── Agentic path (OpenRouter function-calling) ──────────────────────
        if (includeMcpTools !== false && openrouter.isAvailable()) {
          try {
            const loopResult = await toolCallingLoop({
              messages: fullMessages,
              conversationId: convId
            });
            reply = loopResult.reply;
            toolSteps = loopResult.steps || [];
          } catch (loopErr) {
            console.error('[tool-loop] Error, falling back to Ollama:', loopErr.message);
            reply = await chatWithOllama(fullMessages);
          }
        } else {
          // ── Ollama fallback (no function-calling) ─────────────────────────
          reply = await chatWithOllama(fullMessages);
        }

        // Save assistant response
        await db.crud.createMessage(convId, 'assistant', reply);

        // Background: extract + save learned facts
        Promise.all([
          Promise.resolve(systemPrompt.extractFactsFromConversation(messages)).then(f => systemPrompt.saveLearnedFacts(f)).catch(() => {}),
          systemPrompt.extractUserDataWithConfidence(messages).then(d => { if (Array.isArray(d)) systemPrompt.saveLearnedUserData(d); }).catch(() => {})
        ]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          reply,
          conversationId: convId,
          steps: toolSteps,
          tasks: []
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  // =====================================================
  // Streaming Chat Endpoint (SSE)
  // =====================================================
  if (req.method === 'POST' && req.url === '/api/chat/stream') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { messages, includeNotion, includeMcpTools = true, conversationId, reasoningMode, webSearchEnabled } = JSON.parse(body);

        let convId = conversationId;
        if (!convId) {
          let chatTitle = `Chat ${new Date().toLocaleDateString()}`;
          const firstUserMsg = messages.find(m => m.role === 'user');
          if (firstUserMsg && firstUserMsg.content) {
            chatTitle = await generateChatTitle(firstUserMsg.content);
          }
          const conv = await db.crud.createConversation(chatTitle, getModel());
          convId = conv.id;
        } else {
          await db.crud.updateConversation(convId, { updated_at: new Date().toISOString() });
        }

        // Build system prompt
        let systemContent = SYSTEM_PROMPT;
        try {
          const activeInstructions = await instructions.getActiveInstructions();
          if (Array.isArray(activeInstructions) && activeInstructions.length > 0) {
            systemContent += '\n\n## Active Instructions\n';
            activeInstructions.forEach(inst => { systemContent += `- [${inst.category || 'general'}] ${inst.content}\n`; });
          }
        } catch (e) { }
        try {
          const userDataList = await userData.listUserData();
          if (Array.isArray(userDataList) && userDataList.length > 0) {
            systemContent += '\n\n## Known Facts About Adil\n';
            userDataList.forEach(d => { systemContent += `- ${d.key}: ${d.value}\n`; });
          }
        } catch (e) { }

        if (includeNotion && NOTION_TOKEN) {
          const notionData = await queryNotion();
          if (notionData) systemContent += `\n\nLive learning plan:\n${notionData}`;
        }

        if (webSearchEnabled && messages.length > 0) {
          const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
          if (lastUserMsg) {
            try {
              const results = await webSearch.search(lastUserMsg.content, 5);
              if (results.length > 0) systemContent += '\n\n' + webSearch.formatForPrompt(results, lastUserMsg.content);
            } catch (e) { }
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

        // Helper to emit an SSE event
        const emit = (obj) => { res.write(`data: ${JSON.stringify(obj)}\n\n`); };

        let fullReply = '';

        // ── Agentic path (OpenRouter) ─────────────────────────────────────────
        if (includeMcpTools !== false && openrouter.isAvailable()) {
          try {
            const loopResult = await toolCallingLoopStream({
              messages: fullMessages,
              conversationId: convId,
              onStep: (event) => emit(event),
              onToken: (token) => {
                fullReply += token;
                emit({ type: 'token', content: token });
              }
            });
            fullReply = loopResult.reply;
          } catch (loopErr) {
            console.error('[tool-loop-stream] Error, falling back to Ollama:', loopErr.message);
            // Fall through to Ollama
            await streamFromOllama(fullMessages, res, convId);
            return;
          }
        } else {
          // ── Ollama fallback ───────────────────────────────────────────────
          await streamFromOllama(fullMessages, res, convId);
          return;
        }

        // Save final reply and close SSE
        await db.crud.createMessage(convId, 'assistant', fullReply);
        emit({ type: 'done', content: fullReply });
        res.end();

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
    return true;
  }

  return false;
};
