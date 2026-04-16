/**
 * routes/tasks.js
 * GET    /api/tasks         — list tasks
 * POST   /api/tasks         — create task
 * PATCH  /api/tasks/:id     — update task status
 * DELETE /api/tasks/:id     — delete task
 * POST   /api/extract-tasks — extract tasks from message
 *
 * Extracted from server.js (lines 574–679).
 */

const tasks = require('../db/tasks');

module.exports = async function handleTasks(req, res) {
  if (req.method === 'GET' && req.url.startsWith('/api/tasks')) {
    const status = req.url.split('?').length > 1 ? new URLSearchParams(req.url.split('?')[1]).get('status') : null;
    const result = await tasks.getTasks({ status });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return true;
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
    return true;
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
    return true;
  }

  if (req.method === 'DELETE' && req.url.match(/^\/api\/tasks\/(\d+)$/)) {
    const id = parseInt(req.url.split('/')[3]);
    await tasks.deleteTask(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return true;
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
    return true;
  }

  return false;
};
