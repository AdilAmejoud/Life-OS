/**
 * Task Management Module
 * Extracts, stores, and manages tasks from conversations.
 */

const db = require('./db');

/**
 * Extract tasks from a message using pattern matching and AI hints
 */
async function extractTasksFromMessage(message, context = {}) {
  const tasks = [];
  const messageLower = message.toLowerCase();

  // Pattern 1: "create a task to [action]"
  const createTaskMatch = message.match(/create\s+(?:a\s+|an\s+)?task(?:\s+to)?\s+(.+?)(?:\.|$|\n)/i);
  if (createTaskMatch) {
    const action = createTaskMatch[1].trim();
    tasks.push({
      title: action.replace(/^[a-z]/, char => char.toUpperCase()),
      description: `Extracted from: "${message}"`,
      priority: context.priority || 'medium',
      dueDate: context.dueDate
    });
  }

  // Pattern 2: "remind me to [action]"
  const remindMatch = message.match(/remind(?:\s+me)?\s+to\s+(.+?)(?:\.|$|\n)/i);
  if (remindMatch) {
    const action = remindMatch[1].trim();
    tasks.push({
      title: action.replace(/^[a-z]/, char => char.toUpperCase()),
      description: `Reminder from conversation`,
      priority: context.priority || 'medium',
      dueDate: context.dueDate
    });
  }

  // Pattern 3: "schedule [action] for [date/time]"
  const scheduleMatch = message.match(/schedule\s+(.+?)\s+for\s+(.+?)(?:\.|$|\n)/i);
  if (scheduleMatch) {
    const action = scheduleMatch[1].trim();
    const when = scheduleMatch[2].trim();
    tasks.push({
      title: action.replace(/^[a-z]/, char => char.toUpperCase()),
      description: `Scheduled for ${when}: ${message}`,
      priority: context.priority || 'medium',
      dueDate: context.dueDate
    });
  }

  // Pattern 4: "[action] by [date/time]"
  const byMatch = message.match(/(.+?)\s+by\s+(.+?)(?:\.|$|\n)/i);
  if (byMatch) {
    const action = byMatch[1].trim();
    const deadline = byMatch[2].trim();
    if (!createTaskMatch && !remindMatch && !scheduleMatch) {
      tasks.push({
        title: action.replace(/^[a-z]/, char => char.toUpperCase()),
        description: `Deadline: ${deadline}`,
        priority: context.priority || 'high',
        dueDate: context.dueDate
      });
    }
  }

  // Pattern 5: "need to [action]"
  const needMatch = message.match(/need\s+to\s+(.+?)(?:\.|$|\n)/i);
  if (needMatch) {
    const action = needMatch[1].trim();
    if (!createTaskMatch && !remindMatch && !scheduleMatch && !byMatch) {
      tasks.push({
        title: action.replace(/^[a-z]/, char => char.toUpperCase()),
        description: `Extracted need from: "${message}"`,
        priority: context.priority || 'medium',
        dueDate: context.dueDate
      });
    }
  }

  // Pattern 6: "[action], please"
  const pleaseMatch = message.match(/(.+?),\s*please/i);
  if (pleaseMatch) {
    const action = pleaseMatch[1].trim();
    tasks.push({
      title: action.charAt(0).toUpperCase() + action.slice(1),
      description: `Request: "${message}"`,
      priority: context.priority || 'low',
      dueDate: context.dueDate
    });
  }

  return tasks;
}

/**
 * Parse natural language due dates
 */
function parseDueDate(text) {
  const now = new Date();
  const textLower = text.toLowerCase();

  // Tomorrow
  if (textLower.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString();
  }

  // Today
  if (textLower.includes('today')) {
    return now.toISOString();
  }

  // Next [day of week]
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (textLower.includes(`next ${days[i]}`)) {
      const nextDay = new Date(now);
      const currentDay = now.getDay();
      const daysUntil = (i - currentDay + 7) % 7 || 7;
      nextDay.setDate(nextDay.getDate() + daysUntil);
      return nextDay.toISOString();
    }
  }

  // In [number] [timeunit]
  const relativeMatch = text.match(/in\s+(\d+)\s+(minute|hour|day|week|month)/i);
  if (relativeMatch) {
    const value = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const due = new Date(now);

    switch (unit) {
      case 'minute': due.setMinutes(due.getMinutes() + value); break;
      case 'hour': due.setHours(due.getHours() + value); break;
      case 'day': due.setDate(due.getDate() + value); break;
      case 'week': due.setDate(due.getDate() + value * 7); break;
      case 'month': due.setMonth(due.getMonth() + value); break;
    }
    return due.toISOString();
  }

  // Format: YYYY-MM-DD
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return new Date(isoMatch[1]).toISOString();
  }

  return null;
}

/**
 * Create a task from a message
 */
async function createTaskFromMessage(message, conversationId, messageId) {
  const tasks = await extractTasksFromMessage(message);
  const createdTasks = [];

  for (const taskData of tasks) {
    const dueDate = taskData.dueDate || parseDueDate(message);
    const task = await db.crud.createTask(
      conversationId,
      messageId,
      taskData.title,
      taskData.description,
      taskData.priority || 'medium',
      dueDate
    );
    createdTasks.push(task);
  }

  return createdTasks;
}

/**
 * Get tasks by various criteria
 */
async function getTasks(options = {}) {
  let status = options.status || 'pending';
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  if (options.all) {
    status = null;
  }

  return await db.crud.listTasks(status, limit, offset);
}

/**
 * Update task status
 */
async function updateTaskStatus(taskId, newStatus) {
  if (!['pending', 'in-progress', 'completed', 'cancelled'].includes(newStatus)) {
    return { error: `Invalid status: ${newStatus}` };
  }

  return await db.crud.updateTask(taskId, { status: newStatus });
}

/**
 * Get tasks for a conversation
 */
async function getConversationTasks(conversationId) {
  const tasks = await db.crud.listTasks(null, 100);
  return tasks.filter(t => t.conversation_id === conversationId);
}

/**
 * Complete a task
 */
async function completeTask(taskId) {
  return await updateTaskStatus(taskId, 'completed');
}

/**
 * Cancel a task
 */
async function cancelTask(taskId) {
  return await updateTaskStatus(taskId, 'cancelled');
}

/**
 * Get pending tasks count
 */
async function getPendingCount() {
  const tasks = await getTasks({ status: 'pending' });
  return tasks.length;
}

/**
 * Get overdue tasks
 */
async function getOverdueTasks() {
  const now = new Date().toISOString();
  const tasks = await db.crud.listTasks(null, 100);
  return tasks.filter(t => t.due_date && t.due_date < now && t.status !== 'completed');
}

/**
 * Get tasks by priority
 */
async function getTasksByPriority(priority) {
  const tasks = await db.crud.listTasks(null, 100);
  return tasks.filter(t => t.priority === priority);
}

/**
 * Delete a task
 */
async function deleteTask(taskId) {
  return await db.crud.deleteTask(taskId);
}

/**
 * Get all tasks with conversation info
 */
async function getAllTasksDetailed() {
  const tasks = await db.crud.listTasks(null, 100);
  const conversations = {};

  // Fetch conversation titles
  for (const task of tasks) {
    if (task.conversation_id && !conversations[task.conversation_id]) {
      const conv = await db.crud.getConversation(task.conversation_id);
      conversations[task.conversation_id] = conv?.title || 'Unknown';
    }
  }

  return tasks.map(task => ({
    ...task,
    conversationTitle: conversations[task.conversation_id] || 'Direct Task'
  }));
}

/**
 * Export tasks to JSON
 */
async function exportTasks(format = 'json') {
  const tasks = await getAllTasksDetailed();

  if (format === 'json') {
    return JSON.stringify(tasks, null, 2);
  }

  if (format === 'markdown') {
    let md = '# Tasks\n\n';
    const byStatus = {};

    tasks.forEach(t => {
      if (!byStatus[t.status]) byStatus[t.status] = [];
      byStatus[t.status].push(t);
    });

    const statusOrder = ['pending', 'in-progress', 'completed', 'cancelled'];
    statusOrder.forEach(status => {
      if (byStatus[status]) {
        md += `## ${status.toUpperCase()}\n\n`;
        byStatus[status].forEach(t => {
          md += `- [ ] ${t.title}\n`;
          if (t.description) md += `  - ${t.description}\n`;
          if (t.due_date) md += `  - Due: ${t.due_date}\n`;
          md += `\n`;
        });
        md += '\n';
      }
    });

    return md;
  }

  return JSON.stringify(tasks, null, 2);
}

/**
 * Import tasks from JSON
 */
async function importTasks(jsonData) {
  let tasks;
  try {
    tasks = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
  } catch (err) {
    return { error: 'Invalid JSON', details: err.message };
  }

  if (!Array.isArray(tasks)) {
    return { error: 'Expected an array of tasks' };
  }

  const imported = [];
  for (const task of tasks) {
    try {
      const result = await db.crud.createTask(
        task.conversation_id,
        task.message_id,
        task.title,
        task.description,
        task.priority || 'medium',
        task.due_date
      );
      imported.push(result);
    } catch (err) {
      console.error(`Failed to import task "${task.title}":`, err.message);
    }
  }

  return { imported: imported.length, tasks: imported };
}

/**
 * Get statistics
 */
async function getStats() {
  const tasks = await db.crud.listTasks(null, 100);

  const stats = {
    total: tasks.length,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    overdue: 0
  };

  const now = new Date();

  tasks.forEach(t => {
    switch (t.status) {
      case 'pending': stats.pending++; break;
      case 'in-progress': stats.inProgress++; break;
      case 'completed': stats.completed++; break;
      case 'cancelled': stats.cancelled++; break;
    }

    switch (t.priority) {
      case 'high': stats.highPriority++; break;
      case 'medium': stats.mediumPriority++; break;
      case 'low': stats.lowPriority++; break;
    }

    if (t.due_date && new Date(t.due_date) < now && t.status !== 'completed') {
      stats.overdue++;
    }
  });

  return stats;
}

module.exports = {
  extractTasksFromMessage,
  createTaskFromMessage,
  getTasks,
  updateTaskStatus,
  completeTask,
  cancelTask,
  getConversationTasks,
  getPendingCount,
  getOverdueTasks,
  getTasksByPriority,
  deleteTask,
  getAllTasksDetailed,
  exportTasks,
  importTasks,
  getStats,
  parseDueDate,

  // Status constants
  STATUS_PENDING: 'pending',
  STATUS_IN_PROGRESS: 'in-progress',
  STATUS_COMPLETED: 'completed',
  STATUS_CANCELLED: 'cancelled',

  // Priority constants
  PRIORITY_LOW: 'low',
  PRIORITY_MEDIUM: 'medium',
  PRIORITY_HIGH: 'high'
};
