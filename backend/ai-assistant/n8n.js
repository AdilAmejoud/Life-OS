/**
 * n8n Integration Module
 * Connects to n8n API to trigger workflows and get status.
 */

const http = require('http');
const https = require('https');
const querystring = require('querystring');

const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:3700/webhook';

// Parse n8n URL
function parseUrl() {
  let url = N8N_URL;
  if (!url.startsWith('http')) {
    url = `http://${url}`;
  }
  const parsed = new URL(url);
  return {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80'),
    protocol: parsed.protocol.replace(':', ''),
    path: parsed.pathname
  };
}

const n8n = parseUrl();

/**
 * Make API request to n8n
 */
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const { hostname, port, protocol, path: basePath } = n8n;
    const urlPath = `${basePath}${path}`;

    const reqOptions = {
      hostname,
      port,
      path: urlPath,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 30000 // 30 second timeout
    };

    if (N8N_API_KEY) {
      reqOptions.headers['X-N8N-API-KEY'] = N8N_API_KEY;
    }

    const lib = protocol === 'https' ? https : http;

    const req = lib.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`n8n API error: ${res.statusCode} - ${body}`));
          }
        } catch (err) {
          reject(new Error(`Parse error: ${err.message}. Body: ${body.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

/**
 * Test connection to n8n
 */
async function testConnection() {
  try {
    await makeRequest('/health');
    return { status: 'ok', url: N8N_URL };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

/**
 * Get workflow by ID
 */
async function getWorkflow(workflowId) {
  try {
    const result = await makeRequest(`/v1/workflows/${workflowId}`);
    return result;
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * List all workflows
 */
async function listWorkflows() {
  try {
    const result = await makeRequest('/v1/workflows');
    // Handle both array and object response
    const workflows = Array.isArray(result) ? result : result.workflows || [];
    return workflows.map(w => ({
      id: w.id,
      name: w.name,
      active: w.active,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt
    }));
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Trigger a workflow by ID
 */
async function triggerWorkflow(workflowId, payload = {}) {
  try {
    const result = await makeRequest(`/v1/workflows/${workflowId}/trigger`, {
      method: 'POST',
      body: payload
    });
    return {
      success: true,
      executionId: result.executionId,
      result: result.result
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Trigger workflow via webhook
 */
async function triggerWebhook(webhookName, payload = {}) {
  try {
    const { hostname, port, protocol, path: basePath } = n8n;
    const urlPath = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const webhookPath = `webhook/${webhookName}`;

    const reqOptions = {
      hostname,
      port,
      path: `${urlPath}${webhookPath}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const lib = protocol === 'https' ? https : http;

    return new Promise((resolve) => {
      const req = lib.request(reqOptions, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve({
              success: true,
              statusCode: res.statusCode,
              body: json
            });
          } catch {
            resolve({
              success: true,
              statusCode: res.statusCode,
              body: body
            });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.write(JSON.stringify(payload));
      req.end();
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get workflow execution status
 */
async function getExecution(executionId) {
  try {
    const result = await makeRequest(`/v1/executions/${executionId}`);
    return result;
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * List workflow executions
 */
async function listExecutions(workflowId, limit = 10) {
  try {
    const result = await makeRequest(`/v1/executions?workflowId=${workflowId}&limit=${limit}`);
    return result.executions || [];
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Activate/deactivate workflow
 */
async function setWorkflowActive(workflowId, active) {
  try {
    const result = await makeRequest(`/v1/workflows/${workflowId}`, {
      method: 'PATCH',
      body: { active }
    });
    return result;
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Create new workflow from description
 */
async function createWorkflow(name, description) {
  try {
    const workflow = {
      name,
      description: description || '',
      active: true,
      nodes: [
        {
          parameters: {},
          name: 'Start',
          type: 'n8n-nodes-base.start',
          typeVersion: 1,
          position: [240, 300]
        },
        {
          parameters: {},
          name: 'End',
          type: 'n8n-nodes-base.noOp',
          typeVersion: 1,
          position: [400, 300]
        }
      ],
      connections: {
        Start: [
          {
            node: 'End',
            type: 'main',
            index: 0
          }
        ]
      }
    };

    const result = await makeRequest('/v1/workflows', {
      method: 'POST',
      body: workflow
    });
    return result;
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Get workflow statistics
 */
async function getStatistics() {
  try {
    const [workflows, activeCount] = await Promise.all([
      listWorkflows(),
      listWorkflows().then(w => w.filter(aw => aw.active).length)
    ]);

    return {
      total: workflows.length,
      active: activeCount,
      workflows
    };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Find relevant workflow based on user message
 */
async function findRelevantWorkflow(message) {
  const workflows = await listWorkflows();
  if (workflows.length === 0 || workflows.error) return null;

  const keywords = message.toLowerCase().split(/\s+/);

  // Score workflows based on keyword matching
  const scored = workflows.map(w => {
    let score = 0;
    const nameWords = w.name.toLowerCase().split(/\s+/);
    nameWords.forEach(nw => {
      if (keywords.some(k => k.includes(nw) || nw.includes(k))) {
        score += 2;
      }
    });
    return { ...w, score };
  });

  // Return highest scored workflow
  const best = scored.sort((a, b) => b.score - a.score).find(w => w.score > 0);
  return best || null;
}

/**
 * Trigger workflow if relevant
 */
async function maybeTriggerWorkflow(message) {
  const workflow = await findRelevantWorkflow(message);
  if (workflow) {
    const result = await triggerWorkflow(workflow.id);
    return { workflow, result };
  }
  return null;
}

/**
 * Get webhook URL for workflow
 */
function getWebhookUrl(workflowId) {
  const { hostname, port, protocol, path: basePath } = n8n;
  return `${protocol}://${hostname}:${port}${basePath}/webhook/${workflowId}`;
}

// =====================================================
// Workflow Templates
// =====================================================

/**
 * Standard workflow templates
 */
const WORKFLOW_TEMPLATES = {
  daily_summary: {
    name: 'Daily Summary Generator',
    description: 'Collects information and generates a daily summary',
    nodes: [
      {
        parameters: { cronExpression: '0 9 * * *' },
        name: 'Cron',
        type: 'n8n-nodes-base.cron',
        typeVersion: 1,
        position: [240, 300]
      },
      {
        parameters: { resource: 'message', operation: 'get' },
        name: 'Get Messages',
        type: 'n8n-nodes-base.messages',
        typeVersion: 1,
        position: [400, 300]
      },
      {
        parameters: { options: {} },
        name: 'Generate Summary',
        type: 'n8n-nodes-base.summary',
        typeVersion: 1,
        position: [560, 300]
      },
      {
        parameters: {},
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [720, 300]
      }
    ]
  },
  data_collector: {
    name: 'Data Collector',
    description: 'Collects data from multiple sources',
    nodes: [
      {
        parameters: { url: 'https://api.example.com/data' },
        name: 'HTTP Request',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 1,
        position: [240, 300]
      },
      {
        parameters: {},
        name: 'Set',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [400, 300]
      },
      {
        parameters: { database: 'sqlite' },
        name: 'SQLite',
        type: 'n8n-nodes-base.sqlite',
        typeVersion: 1,
        position: [560, 300]
      }
    ]
  },
  notification: {
    name: 'Notification Sender',
    description: 'Sends notifications when triggered',
    nodes: [
      {
        parameters: {},
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [240, 300]
      },
      {
        parameters: { condition: { operations: [] } },
        name: 'If',
        type: 'n8n-nodes-base.if',
        typeVersion: 1,
        position: [400, 300]
      },
      {
        parameters: { options: {} },
        name: 'Send Email',
        type: 'n8n-nodes-base.sendEmail',
        typeVersion: 1,
        position: [560, 200]
      },
      {
        parameters: {},
        name: 'Telegram',
        type: 'n8n-nodes-base.telegram',
        typeVersion: 1,
        position: [560, 400]
      }
    ]
  },
  automation: {
    name: 'Simple Automation',
    description: 'Basic automation workflow',
    nodes: [
      {
        parameters: {},
        name: 'Start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [240, 300]
      },
      {
        parameters: {},
        name: 'Function',
        type: 'n8n-nodes-base.function',
        typeVersion: 1,
        position: [400, 300]
      },
      {
        parameters: {},
        name: 'End',
        type: 'n8n-nodes-base.noOp',
        typeVersion: 1,
        position: [560, 300]
      }
    ]
  }
};

/**
 * Create workflow from template
 */
async function createWorkflowFromTemplate(templateName, overrides = {}) {
  const template = WORKFLOW_TEMPLATES[templateName];
  if (!template) {
    return { error: `Unknown template: ${templateName}` };
  }

  const workflow = {
    name: overrides.name || template.name,
    description: overrides.description || template.description,
    active: true,
    nodes: template.nodes.map(node => ({
      ...node,
      position: [
        node.position[0] + (overrides.offsetX || 0),
        node.position[1] + (overrides.offsetY || 0)
      ]
    })),
    connections: template.connections || {}
  };

  try {
    const result = await makeRequest('/v1/workflows', {
      method: 'POST',
      body: workflow
    });
    return { success: true, workflow: result };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Get available templates
 */
function getTemplates() {
  return Object.entries(WORKFLOW_TEMPLATES).map(([key, template]) => ({
    key,
    ...template
  }));
}

/**
 * Find relevant workflow based on user message (enhanced)
 */
async function findRelevantWorkflow(message) {
  const workflows = await listWorkflows();
  if (workflows.length === 0 || workflows.error) return null;

  const keywords = message.toLowerCase().split(/\s+/);

  // Score workflows based on keyword matching
  const scored = workflows.map(w => {
    let score = 0;
    const nameWords = w.name.toLowerCase().split(/\s+/);
    nameWords.forEach(nw => {
      if (keywords.some(k => k.includes(nw) || nw.includes(k))) {
        score += 2;
      }
    });
    // Bonus for workflow description matches
    if (w.description) {
      const descWords = w.description.toLowerCase().split(/\s+/);
      descWords.forEach(dw => {
        if (keywords.some(k => k.includes(dw) || dw.includes(k))) {
          score += 1;
        }
      });
    }
    return { ...w, score };
  });

  // Return highest scored workflow
  const best = scored.sort((a, b) => b.score - a.score).find(w => w.score > 0);
  return best || null;
}

/**
 * Trigger workflow if relevant (enhanced)
 */
async function maybeTriggerWorkflow(message) {
  const workflow = await findRelevantWorkflow(message);
  if (workflow) {
    const result = await triggerWorkflow(workflow.id);
    return { workflow, result };
  }

  // Try to suggest a workflow template
  const templateSuggestion = suggestWorkflowTemplate(message);
  if (templateSuggestion) {
    return { suggestedTemplate: templateSuggestion, reason: 'No matching workflow found' };
  }

  return null;
}

/**
 * Suggest a workflow template based on message
 */
function suggestWorkflowTemplate(message) {
  const msgLower = message.toLowerCase();

  if (msgLower.includes('summary') || msgLower.includes('report') || msgLower.includes('daily')) {
    return { template: 'daily_summary', reason: 'Message mentions summary/report' };
  }

  if (msgLower.includes('collect') || msgLower.includes('gather') || msgLower.includes('import')) {
    return { template: 'data_collector', reason: 'Message mentions data collection' };
  }

  if (msgLower.includes('send') || msgLower.includes('notify') || msgLower.includes('email')) {
    return { template: 'notification', reason: 'Message mentions sending/notifications' };
  }

  if (msgLower.includes('automat') || msgLower.includes('trigger') || msgLower.includes('if')) {
    return { template: 'automation', reason: 'Message mentions automation' };
  }

  return null;
}

/**
 * Get webhook URL for workflow
 */
function getWebhookUrl(workflowId) {
  const { hostname, port, protocol, path: basePath } = n8n;
  return `${protocol}://${hostname}:${port}${basePath}/webhook/${workflowId}`;
}

module.exports = {
  testConnection,
  getWorkflow,
  listWorkflows,
  triggerWorkflow,
  triggerWebhook,
  getExecution,
  listExecutions,
  setWorkflowActive,
  createWorkflow,
  getStatistics,
  findRelevantWorkflow,
  maybeTriggerWorkflow,
  getWebhookUrl,
  getTemplates,
  createWorkflowFromTemplate,
  suggestWorkflowTemplate,

  // Constants
  N8N_URL,
  N8N_API_KEY,
  N8N_WEBHOOK_URL,
  WORKFLOW_TEMPLATES
};
