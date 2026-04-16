/**
 * Agentic Tool-Calling Loop
 *
 * Iterates:
 *   1. Send messages + tools to OpenRouter
 *   2. If model wants to call tools → execute them → append results → repeat
 *   3. If model returns plain content → done
 *
 * Calls onStep(event) for each intermediate step, enabling SSE progress streaming.
 *
 * Tool format expected from mcp.listToolsForLLM():
 *   [{ type: 'function', function: { name, description, parameters } }]
 */

'use strict';

const openrouter = require('../integrations/openrouter');
const mcp = require('../integrations/mcp');

const MAX_STEPS_DEFAULT = 6;

// ─── Helper: safe JSON parse of tool arguments ────────────────────────────────
function safeParseArgs(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'args must be a string' };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: `Invalid JSON args: ${e.message}` };
  }
}

// ─── Execute a single tool call from the model ────────────────────────────────
async function executeToolCall(toolCall) {
  const name = toolCall?.function?.name;
  const argsRaw = toolCall?.function?.arguments;
  const callId = toolCall?.id || `call_${Date.now()}`;

  // Resolve tool from MCP registry
  const tool = name ? mcp.getTool(name) : null;

  if (!tool) {
    return {
      role: 'tool',
      tool_call_id: callId,
      content: JSON.stringify({ ok: false, error: `Unknown tool: ${name || 'null'}` })
    };
  }

  const parsed = safeParseArgs(argsRaw);
  if (!parsed.ok) {
    return {
      role: 'tool',
      tool_call_id: callId,
      content: JSON.stringify({ ok: false, error: parsed.error })
    };
  }

  try {
    // MCP tools can have different call signatures (some take (params), some take (operation, options))
    // The updated mcp.js exposes execute(params) consistently — see Phase 2 changes.
    const result = await tool.execute(parsed.value);
    return {
      role: 'tool',
      tool_call_id: callId,
      content: JSON.stringify(result)
    };
  } catch (err) {
    return {
      role: 'tool',
      tool_call_id: callId,
      content: JSON.stringify({ ok: false, error: openrouter.asErrorMessage(err) })
    };
  }
}

/**
 * Main agentic loop.
 *
 * @param {object} opts
 * @param {object[]}  opts.messages          - Chat history (role/content pairs)
 * @param {string}    [opts.model]           - OpenRouter model id
 * @param {number}    [opts.maxSteps]        - Max tool-call iterations (default 6)
 * @param {function}  [opts.onStep]          - Callback(event) for SSE progress
 *   event shapes:
 *     { type: 'tool_start',  name, args }
 *     { type: 'tool_result', name, result }
 *     { type: 'token',       content }       ← not emitted here, handled by stream layer
 *
 * @returns {Promise<{ reply: string, steps: object[], model: string }>}
 */
async function toolCallingLoop({ messages, model, maxSteps = MAX_STEPS_DEFAULT, onStep }) {
  if (!openrouter.isAvailable()) {
    throw new Error('OPENROUTER_API_KEY is not set — tool loop unavailable');
  }

  const resolvedModel = model || openrouter.DEFAULT_MODEL;
  const tools = mcp.listToolsForLLM();
  const steps = [];

  // Build working message list (we mutate a local copy)
  const workingMessages = Array.isArray(messages) ? [...messages] : [];

  for (let step = 0; step < maxSteps; step++) {
    // Ask the model (non-streaming for tool-calling turns)
    const completion = await openrouter.chatCompletion({
      model: resolvedModel,
      messages: workingMessages,
      tools,
      tool_choice: 'auto'
    });

    const { content, tool_calls, finish_reason } = completion;

    // Append assistant message to working context
    const assistantMsg = {
      role: 'assistant',
      content: content || ''
    };
    if (Array.isArray(tool_calls) && tool_calls.length > 0) {
      assistantMsg.tool_calls = tool_calls;
    }
    workingMessages.push(assistantMsg);

    // ── No tool calls → we have the final answer ──────────────────────────────
    if (!Array.isArray(tool_calls) || tool_calls.length === 0) {
      return {
        reply: content || '',
        steps,
        model: resolvedModel
      };
    }

    // ── Execute each tool call sequentially ───────────────────────────────────
    for (const tc of tool_calls) {
      const toolName = tc?.function?.name;
      const argsRaw = tc?.function?.arguments;
      let toolArgs = {};
      try { toolArgs = JSON.parse(argsRaw || '{}'); } catch { /* ignore */ }

      // Emit start event
      const startEvent = { type: 'tool_start', name: toolName, args: toolArgs };
      steps.push(startEvent);
      if (typeof onStep === 'function') onStep(startEvent);

      // Execute
      const toolMsg = await executeToolCall(tc);
      workingMessages.push(toolMsg);

      // Parse result for the event
      let parsedResult = {};
      try { parsedResult = JSON.parse(toolMsg.content); } catch { parsedResult = { raw: toolMsg.content }; }

      // Emit result event
      const resultEvent = { type: 'tool_result', name: toolName, result: parsedResult };
      steps.push(resultEvent);
      if (typeof onStep === 'function') onStep(resultEvent);
    }
  }

  // Hit max steps without a final text response
  return {
    reply: 'I reached the maximum number of tool steps without producing a final answer. Please try rephrasing your request.',
    steps,
    model: resolvedModel
  };
}

/**
 * Like toolCallingLoop but streams the final reply token-by-token
 * via onToken(text). Tool steps are still emitted via onStep.
 *
 * @returns {Promise<{ reply: string, steps: object[], model: string }>}
 */
async function toolCallingLoopStream({ messages, model, maxSteps = MAX_STEPS_DEFAULT, onStep, onToken }) {
  if (!openrouter.isAvailable()) {
    throw new Error('OPENROUTER_API_KEY is not set — tool loop unavailable');
  }

  const resolvedModel = model || openrouter.DEFAULT_MODEL;
  const tools = mcp.listToolsForLLM();
  const steps = [];
  const workingMessages = Array.isArray(messages) ? [...messages] : [];

  for (let step = 0; step < maxSteps; step++) {
    // Non-streaming for tool-calling turns
    const completion = await openrouter.chatCompletion({
      model: resolvedModel,
      messages: workingMessages,
      tools,
      tool_choice: 'auto'
    });

    const { content, tool_calls } = completion;

    const assistantMsg = { role: 'assistant', content: content || '' };
    if (Array.isArray(tool_calls) && tool_calls.length > 0) {
      assistantMsg.tool_calls = tool_calls;
    }
    workingMessages.push(assistantMsg);

    // ── No tool calls → stream the final answer ───────────────────────────────
    if (!Array.isArray(tool_calls) || tool_calls.length === 0) {
      // If content is already available (non-null from this last completion),
      // stream it token-by-token from the existing string to avoid a second API call.
      if (content) {
        // Simulate streaming by chunking the existing content
        const chunkSize = 20;
        for (let i = 0; i < content.length; i += chunkSize) {
          const chunk = content.slice(i, i + chunkSize);
          if (typeof onToken === 'function') onToken(chunk);
        }
        return { reply: content, steps, model: resolvedModel };
      }

      // Otherwise do a fresh streaming call (tool_choice: none to avoid loops)
      const reply = await openrouter.streamChatCompletion({
        model: resolvedModel,
        messages: workingMessages,
        onToken
      });
      return { reply, steps, model: resolvedModel };
    }

    // ── Execute tool calls ────────────────────────────────────────────────────
    for (const tc of tool_calls) {
      const toolName = tc?.function?.name;
      let toolArgs = {};
      try { toolArgs = JSON.parse(tc?.function?.arguments || '{}'); } catch { /* ignore */ }

      const startEvent = { type: 'tool_start', name: toolName, args: toolArgs };
      steps.push(startEvent);
      if (typeof onStep === 'function') onStep(startEvent);

      const toolMsg = await executeToolCall(tc);
      workingMessages.push(toolMsg);

      let parsedResult = {};
      try { parsedResult = JSON.parse(toolMsg.content); } catch { parsedResult = { raw: toolMsg.content }; }

      const resultEvent = { type: 'tool_result', name: toolName, result: parsedResult };
      steps.push(resultEvent);
      if (typeof onStep === 'function') onStep(resultEvent);
    }
  }

  const fallback = 'I reached the maximum number of tool steps. Please try rephrasing your request.';
  if (typeof onToken === 'function') onToken(fallback);
  return { reply: fallback, steps, model: resolvedModel };
}

module.exports = { toolCallingLoop, toolCallingLoopStream };
