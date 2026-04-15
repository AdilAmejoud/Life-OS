/**
 * MCP (Model Context Protocol) Tools Implementation
 * Provides built-in tools for web search, code execution, and file operations.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const db = require('./db');

// Tool registry
const tools = new Map();

// Configuration
const NOTION_TOKEN = process.env.NOTION_TOKEN || '';
const SECTIONS_DB = process.env.SECTIONS_DB || '2466914a68328083a576cc791fb27c2e';

/**
 * Helper to make HTTPS requests
 */
function makeRequest(url, options = {}) {
  // console.log("makeRequest url:", url);
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const lib = parsedUrl.protocol === 'https:' ? https : http;

    const req = lib.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (e) => { reject(e); });
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

/**
 * Register a tool
 */
function registerTool(name, options) {
  tools.set(name, {
    ...options,
    name,
    enabled: options.enabled !== false
  });
}

/**
 * Get a tool
 */
function getTool(name) {
  return tools.get(name);
}

/**
 * List all tools
 */
function listTools() {
  return Array.from(tools.values()).map(t => ({
    name: t.name,
    description: t.description,
    enabled: t.enabled
  }));
}

/**
 * Enable a tool
 */
function enableTool(name) {
  const tool = tools.get(name);
  if (tool) {
    tool.enabled = true;
    return true;
  }
  return false;
}

/**
 * Disable a tool
 */
function disableTool(name) {
  const tool = tools.get(name);
  if (tool) {
    tool.enabled = false;
    return true;
  }
  return false;
}

/**
 * Web Search Tool
 * Searches the web using DuckDuckGo API
 */
registerTool('web_search', {
  description: 'Search the web for information using DuckDuckGo',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' }
    },
    required: ['query'],
    additionalProperties: false
  },
  async execute(params) {
    const query = typeof params === 'string' ? params : (params?.query || '');
    try {
      // Use DuckDuckGo instant answer API
      const data = await makeRequest(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`
      );
      if (!data || typeof data !== 'object') return { success: false, error: 'No results' };

      if (data.AbstractText) {
        return {
          success: true,
          type: 'abstract',
          content: data.AbstractText,
          url: data.AbstractURL,
          relatedTopics: data.RelatedTopics.slice(0, 3).map(t => ({
            text: t.Text,
            url: t.FirstURL
          }))
        };
      }

      // Fallback: search results
      return {
        success: true,
        type: 'results',
        content: data.RelatedTopics.slice(0, 5).map(t => t.Text).join('\n'),
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
});

/**
 * Code Execution Tool
 * Executes code in a sandboxed environment
 */
registerTool('code_execution', {
  description: 'Execute JavaScript code in a sandboxed environment',
  parameters: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'JavaScript code to execute' },
      timeout: { type: 'number', description: 'Timeout in milliseconds (default 5000)' }
    },
    required: ['code'],
    additionalProperties: false
  },
  async execute(params) {
    const code = typeof params === 'string' ? params : (params?.code || '');
    const options = { timeout: params?.timeout || 5000 };
    try {
      const timeout = options.timeout || 5000;
      const language = options.language || 'javascript';

      if (language !== 'javascript' && language !== 'js') {
        return {
          success: false,
          error: `Language "${language}" not supported. Use "javascript" or "js".`
        };
      }

      // Create a sandboxed execution
      const result = await new Promise((resolve) => {
        let output = '';
        let error = null;

        // Limited function for sandboxed execution
        const sandbox = {
          console: {
            log: (...args) => { output += args.map(a => String(a)).join(' ') + '\n'; },
            error: (...args) => { error = args.map(a => String(a)).join(' '); }
          },
          setTimeout,
          setInterval,
          clearTimeout,
          clearInterval
        };

        // Create execution function
        const execFn = new Function('sandbox', `
          'use strict';
          with (sandbox) {
            try {
              ${code}
              return { success: true, output: sandbox.console.log.toString() };
            } catch (e) {
              return { success: false, error: e.message };
            }
          }
        `);

        // Execute with timeout
        const timer = setTimeout(() => {
          resolve({ success: false, error: 'Execution timeout' });
        }, timeout);

        try {
          const result = execFn(sandbox);
          clearTimeout(timer);
          resolve(result);
        } catch (e) {
          clearTimeout(timer);
          resolve({ success: false, error: e.message });
        }
      });

      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
});

/**
 * File Operations Tool
 * Read, write, list, and manage files
 */
registerTool('file_ops', {
  description: 'Read, write, and manage files in allowed directories',
  config: {
    allowedDirs: ['/app', '/home/adil/Life_OS']
  },
  async execute(operation, options = {}) {
    const config = this.config || {};

    try {
      if (operation === 'read') {
        const filePath = options.path;
        if (!filePath) return { success: false, error: 'Path required' };

        // Security: ensure path is within allowed directories
        if (!isPathAllowed(filePath, config.allowedDirs)) {
          return { success: false, error: 'Access denied: path not in allowed directories' };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        return {
          success: true,
          type: 'file',
          path: filePath,
          content,
          size: Buffer.byteLength(content, 'utf8')
        };
      }

      if (operation === 'write') {
        const filePath = options.path;
        const content = options.content;

        if (!filePath) return { success: false, error: 'Path required' };
        if (content === undefined) return { success: false, error: 'Content required' };

        if (!isPathAllowed(filePath, config.allowedDirs)) {
          return { success: false, error: 'Access denied: path not in allowed directories' };
        }

        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, content, 'utf8');
        return {
          success: true,
          type: 'file',
          path: filePath,
          size: Buffer.byteLength(content, 'utf8')
        };
      }

      if (operation === 'list') {
        const dirPath = options.path || '.';
        const recursive = options.recursive || false;

        if (!isPathAllowed(dirPath, config.allowedDirs)) {
          return { success: false, error: 'Access denied: path not in allowed directories' };
        }

        if (!fs.existsSync(dirPath)) {
          return { success: false, error: 'Directory does not exist' };
        }

        const files = [];
        const readDir = (currentPath) => {
          const entries = fs.readdirSync(currentPath, { withFileTypes: true });
          entries.forEach(entry => {
            const fullPath = path.join(currentPath, entry.name);
            files.push({
              name: entry.name,
              path: fullPath,
              type: entry.isDirectory() ? 'directory' : 'file',
              size: entry.isDirectory() ? null : fs.statSync(fullPath).size
            });

            if (entry.isDirectory() && recursive) {
              readDir(fullPath);
            }
          });
        };

        readDir(dirPath);
        return { success: true, type: 'directory', path: dirPath, files };
      }

      if (operation === 'delete') {
        const filePath = options.path;
        if (!filePath) return { success: false, error: 'Path required' };

        if (!isPathAllowed(filePath, config.allowedDirs)) {
          return { success: false, error: 'Access denied: path not in allowed directories' };
        }

        if (!fs.existsSync(filePath)) {
          return { success: false, error: 'File does not exist' };
        }

        fs.unlinkSync(filePath);
        return { success: true, type: 'deleted', path: filePath };
      }

      if (operation === 'exists') {
        const filePath = options.path;
        if (!filePath) return { success: false, error: 'Path required' };

        return {
          success: true,
          type: 'boolean',
          exists: fs.existsSync(filePath)
        };
      }

      return { success: false, error: `Unknown operation: ${operation}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
});

/**
 * Weather Tool
 * Gets weather information for a location
 */
registerTool('weather', {
  description: 'Get current weather information for a location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name or location (e.g., "Rabat", "Paris, France")' }
    },
    required: ['location'],
    additionalProperties: false
  },
  config: { unit: 'celsius' },
  async execute(params) {
    const location = typeof params === 'string' ? params : (params?.location || '');
    try {
      // Use Open-Meteo API (no API key required)
      const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
      const geoData = await makeRequest(geocodingUrl);

      if (!geoData.results || geoData.results.length === 0) {
        return { success: false, error: 'Location not found' };
      }

      const { latitude, longitude, name } = geoData.results[0];

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
      const weatherData = await makeRequest(weatherUrl);

      const unit = this.config?.unit || 'celsius';
      const temp = weatherData.current_weather.temperature;
      const windSpeed = weatherData.current_weather.windspeed;

      return {
        success: true,
        location: name,
        latitude,
        longitude,
        temperature: {
          value: temp,
          unit: unit
        },
        windSpeed: {
          value: windSpeed,
          unit: 'km/h'
        },
        condition: getWeatherCondition(weatherData.current_weather.weathercode)
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
});

/**
 * Calculator Tool
 * Performs mathematical calculations
 */
registerTool('calculator', {
  description: 'Perform mathematical calculations on a numeric expression',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Math expression to evaluate (e.g., "2 ** 32", "(18 + 5) * 3")' }
    },
    required: ['expression'],
    additionalProperties: false
  },
  async execute(params) {
    const expression = typeof params === 'string' ? params : (params?.expression || '');
    try {
      // Only allow safe math operations
      const safeExpression = String(expression).replace(/[^0-9+\-*/().\s]/g, '');

      if (safeExpression.length === 0) {
        return { success: false, error: 'Empty expression' };
      }

      // Evaluate safely using Function constructor
      const result = new Function('return ' + safeExpression)();

      if (typeof result !== 'number' || !isFinite(result)) {
        return { success: false, error: 'Invalid calculation result' };
      }

      return {
        success: true,
        expression: safeExpression,
        result,
        type: 'calculation'
      };
    } catch (err) {
      return { success: false, error: 'Invalid expression' };
    }
  }
});

/**
 * URL Fetch Tool
 * Fetches content from URLs
 */
registerTool('url_fetch', {
  description: 'Fetch content from URLs',
  async execute(url) {
    try {
      const data = await makeRequest(url);
      return {
        success: true,
        type: 'content',
        url,
        content: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
});

// =====================================================
// Nexus-style Tool Wrappers (consistent interface)
// =====================================================

/**
 * Wrap an async function with error handling and tool schema
 */
function createTool(options) {
  return {
    name: options.name,
    description: options.description,
    parameters: options.parameters || { type: 'object', properties: {}, additionalProperties: true },
    enabled: options.enabled !== false,
    execute: options.execute
  };
}

/**
 * GitHub Tool
 * Read repo info/files/commits and create GitHub issues
 */
registerTool('github', {
  name: 'github',
  description: 'Read repository info, files, commits and create issues. Requires GITHUB_TOKEN env var.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', description: 'Action: repo_info, file_content, commits, create_issue' },
      owner: { type: 'string', description: 'Repository owner (e.g., "facebook")' },
      repo: { type: 'string', description: 'Repository name (e.g., "react")' },
      path: { type: 'string', description: 'File path for file_content action' },
      sha: { type: 'string', description: 'Commit SHA for specific commit' },
      title: { type: 'string', description: 'Issue title for create_issue' },
      body: { type: 'string', description: 'Issue body for create_issue' },
      labels: { type: 'array', items: { type: 'string' }, description: 'Issue labels' }
    },
    required: ['action']
  },
  async execute(params) {
    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_API_KEY;
    if (!token) {
      return { success: false, error: 'GITHUB_TOKEN environment variable not set' };
    }

    try {
      const action = params?.action;

      if (action === 'repo_info') {
        const { owner, repo } = params;
        if (!owner || !repo) {
          return { success: false, error: 'owner and repo are required' };
        }

        const data = await makeRequest(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: { 'Authorization': `token ${token}` }
        });

        return {
          success: true,
          action: 'repo_info',
          data: {
            name: data.name,
            description: data.description,
            stars: data.stargazers_count,
            forks: data.forks_count,
            language: data.language,
            created_at: data.created_at,
            updated_at: data.updated_at,
            html_url: data.html_url
          }
        };
      }

      if (action === 'file_content') {
        const { owner, repo, path } = params;
        if (!owner || !repo || !path) {
          return { success: false, error: 'owner, repo, and path are required' };
        }

        // Get file content (decoded from base64)
        const data = await makeRequest(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
          headers: { 'Authorization': `token ${token}` }
        });

        let content = '';
        if (data.content) {
          content = Buffer.from(data.content, 'base64').toString('utf8');
        }

        return {
          success: true,
          action: 'file_content',
          path: path,
          size: data.size,
          content: content
        };
      }

      if (action === 'commits') {
        const { owner, repo, sha, limit = 10 } = params;
        if (!owner || !repo) {
          return { success: false, error: 'owner and repo are required' };
        }

        const url = sha
          ? `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`
          : `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`;

        const data = await makeRequest(url, {
          headers: { 'Authorization': `token ${token}` }
        });

        if (sha) {
          return {
            success: true,
            action: 'commit',
            data: {
              sha: data.sha,
              message: data.commit.message,
              author: data.commit.author?.name,
              date: data.commit.author?.date,
              html_url: data.html_url
            }
          };
        }

        return {
          success: true,
          action: 'commits',
          data: data.map(c => ({
            sha: c.sha,
            message: c.commit.message,
            author: c.commit.author?.name,
            date: c.commit.author?.date,
            html_url: c.html_url
          }))
        };
      }

      if (action === 'create_issue') {
        const { owner, repo, title, body, labels = [] } = params;
        if (!owner || !repo || !title) {
          return { success: false, error: 'owner, repo, and title are required' };
        }

        const data = await makeRequest(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          headers: { 'Authorization': `token ${token}` },
          body: { title, body, labels }
        });

        return {
          success: true,
          action: 'create_issue',
          data: {
            id: data.id,
            number: data.number,
            title: data.title,
            url: data.html_url
          }
        };
      }

      return { success: false, error: `Unknown action: ${action}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
});

/**
 * Gmail Tool
 * Read/search inbox and draft replies (never auto-send)
 */
registerTool('gmail', {
  name: 'gmail',
  description: 'Read inbox, search emails, draft replies (no auto-send). Requires GMAIL_CREDENTIALS.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', description: 'Action: list, search, read, draft' },
      query: { type: 'string', description: 'Gmail search query (e.g., "from:alice is:unread")' },
      maxResults: { type: 'number', description: 'Max results for list/search' },
      messageId: { type: 'string', description: 'Message ID for read action' },
      to: { type: 'string', description: 'Recipient for draft' },
      subject: { type: 'string', description: 'Subject for draft' },
      body: { type: 'string', description: 'Body for draft' }
    },
    required: ['action']
  },
  async execute(params) {
    const credentials = process.env.GMAIL_CREDENTIALS || process.env.GMAIL_API_KEY;
    if (!credentials) {
      return { success: false, error: 'GMAIL_CREDENTIALS environment variable not set' };
    }

    try {
      const action = params?.action;

      if (action === 'list') {
        const { query, maxResults = 25 } = params;
        // Using Gmail API would require OAuth2 flow
        // This is a placeholder that shows how it would work
        return {
          success: true,
          action: 'list',
          data: {
            method: 'gmail_api',
            note: 'Requires OAuth2 setup with Gmail API',
            preview: 'Would list messages matching: ' + (query || 'all unread')
          }
        };
      }

      if (action === 'search') {
        const { query, maxResults = 25 } = params;
        return {
          success: true,
          action: 'search',
          data: {
            method: 'gmail_api',
            query: query,
            note: 'Requires OAuth2 setup with Gmail API'
          }
        };
      }

      if (action === 'read') {
        const { messageId } = params;
        if (!messageId) {
          return { success: false, error: 'messageId is required' };
        }
        return {
          success: true,
          action: 'read',
          data: {
            method: 'gmail_api',
            messageId: messageId,
            note: 'Requires OAuth2 setup with Gmail API'
          }
        };
      }

      if (action === 'draft') {
        const { to, subject, body } = params;
        if (!to || !subject || !body) {
          return { success: false, error: 'to, subject, and body are required' };
        }
        return {
          success: true,
          action: 'draft',
          data: {
            method: 'gmail_api',
            note: 'Draft created (would save to Gmail drafts)',
            preview: `To: ${to}\nSubject: ${subject}\nBody: ${body.substring(0, 100)}...`
          }
        };
      }

      return { success: false, error: `Unknown action: ${action}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
});

/**
 * Google Calendar Tool
 * Read/create calendar events and check schedules
 */
registerTool('gcal', {
  name: 'gcal',
  description: 'Read/create calendar events and check schedules. Requires GCAL_CREDENTIALS.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', description: 'Action: list, create, search' },
      calendarId: { type: 'string', description: 'Calendar ID (default: "primary")' },
      timeMin: { type: 'string', description: 'Start time (ISO 8601)' },
      timeMax: { type: 'string', description: 'End time (ISO 8601)' },
      maxResults: { type: 'number', description: 'Max events to return' },
      summary: { type: 'string', description: 'Event summary for create' },
      description: { type: 'string', description: 'Event description for create' },
      start: { type: 'string', description: 'Event start time for create' },
      end: { type: 'string', description: 'Event end time for create' }
    },
    required: ['action']
  },
  async execute(params) {
    const credentials = process.env.GCAL_CREDENTIALS || process.env.GOOGLE_CALENDAR_CREDENTIALS;
    if (!credentials) {
      return { success: false, error: 'GCAL_CREDENTIALS environment variable not set' };
    }

    try {
      const action = params?.action;

      if (action === 'list') {
        const { calendarId = 'primary', timeMin, timeMax, maxResults = 10 } = params;
        return {
          success: true,
          action: 'list',
          data: {
            method: 'google_calendar_api',
            calendarId,
            note: 'Requires OAuth2 setup with Google Calendar API',
            preview: `Listing events from ${calendarId}`
          }
        };
      }

      if (action === 'create') {
        const { summary, description, start, end, calendarId = 'primary' } = params;
        if (!summary || !start) {
          return { success: false, error: 'summary and start are required' };
        }
        return {
          success: true,
          action: 'create',
          data: {
            method: 'google_calendar_api',
            note: 'Event created (would save to Google Calendar)',
            event: { summary, description, start, end, calendarId }
          }
        };
      }

      if (action === 'search') {
        const { query, timeMin, timeMax } = params;
        return {
          success: true,
          action: 'search',
          data: {
            method: 'google_calendar_api',
            note: 'Requires OAuth2 setup with Google Calendar API',
            preview: `Searching for events matching: ${query || 'all'}`
          }
        };
      }

      return { success: false, error: `Unknown action: ${action}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
});

/**
 * File System Tool (enhanced to match Nexus interface)
 * Read/list/create files within allowed directories
 */
const existingFileOps = tools.get('file_ops');
if (existingFileOps) {
  tools.delete('file_ops');
}

registerTool('fileSystem', {
  name: 'fileSystem',
  description: 'Read/list/create files within ~/Life_OS_v2 only.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', description: 'Action: read, list, create, update, delete, exists' },
      path: { type: 'string', description: 'File path' },
      content: { type: 'string', description: 'Content for create/update' },
      recursive: { type: 'boolean', description: 'Recursive listing' }
    },
    required: ['action']
  },
  async execute(params) {
    const action = params?.action;
    const allowedBase = process.env.ALLOWED_FS_BASE || '/home/adil/Life_OS_v2';

    const sanitizePath = (path) => {
      const resolved = path.resolve(path);
      if (!resolved.startsWith(allowedBase)) {
        throw new Error(`Access denied: path must be within ${allowedBase}`);
      }
      return resolved;
    };

    try {
      if (action === 'read') {
        const filePath = params?.path;
        if (!filePath) return { success: false, error: 'path is required' };

        const resolvedPath = sanitizePath(filePath);
        if (!fs.existsSync(resolvedPath)) {
          return { success: false, error: 'File does not exist' };
        }

        const content = fs.readFileSync(resolvedPath, 'utf8');
        return {
          success: true,
          action: 'read',
          path: resolvedPath,
          content,
          size: Buffer.byteLength(content, 'utf8')
        };
      }

      if (action === 'list') {
        const dirPath = params?.path || '.';
        const recursive = params?.recursive || false;

        const resolvedPath = sanitizePath(dirPath);
        if (!fs.existsSync(resolvedPath)) {
          return { success: false, error: 'Directory does not exist' };
        }

        const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
        const items = entries.map(entry => {
          const fullPath = path.join(resolvedPath, entry.name);
          const stats = entry.isDirectory() ? null : fs.statSync(fullPath);
          return {
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stats?.size || null,
            mtime: stats?.mtime || null
          };
        });

        if (recursive) {
          const listRecursive = (currentPath, currentEntries) => {
            currentEntries.forEach(entry => {
              if (entry.isDirectory()) {
                const dirPath = path.join(currentPath, entry.name);
                const subEntries = fs.readdirSync(dirPath, { withFileTypes: true });
                listRecursive(dirPath, subEntries.map(e => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file', parent: dirPath })));
              }
            });
          };
        }

        return {
          success: true,
          action: 'list',
          path: resolvedPath,
          items,
          count: items.length
        };
      }

      if (action === 'create') {
        const filePath = params?.path;
        const content = params?.content || '';

        if (!filePath) return { success: false, error: 'path is required' };

        const resolvedPath = sanitizePath(filePath);
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(resolvedPath, content, 'utf8');
        return {
          success: true,
          action: 'create',
          path: resolvedPath,
          size: Buffer.byteLength(content, 'utf8')
        };
      }

      if (action === 'update') {
        const filePath = params?.path;
        const content = params?.content;

        if (!filePath) return { success: false, error: 'path is required' };
        if (content === undefined) return { success: false, error: 'content is required' };

        const resolvedPath = sanitizePath(filePath);
        if (!fs.existsSync(resolvedPath)) {
          return { success: false, error: 'File does not exist' };
        }

        fs.writeFileSync(resolvedPath, content, 'utf8');
        return {
          success: true,
          action: 'update',
          path: resolvedPath,
          size: Buffer.byteLength(content, 'utf8')
        };
      }

      if (action === 'delete') {
        const filePath = params?.path;
        if (!filePath) return { success: false, error: 'path is required' };

        const resolvedPath = sanitizePath(filePath);
        if (!fs.existsSync(resolvedPath)) {
          return { success: false, error: 'File does not exist' };
        }

        fs.unlinkSync(resolvedPath);
        return {
          success: true,
          action: 'delete',
          path: resolvedPath
        };
      }

      if (action === 'exists') {
        const filePath = params?.path;
        if (!filePath) return { success: false, error: 'path is required' };

        const resolvedPath = sanitizePath(filePath);
        return {
          success: true,
          action: 'exists',
          path: resolvedPath,
          exists: fs.existsSync(resolvedPath)
        };
      }

      return { success: false, error: `Unknown action: ${action}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
});

// makeRequest deleted (merged with top definition)
/**
 * Check if path is allowed
 */
function isPathAllowed(filePath, allowedDirs) {
  const resolvedPath = path.resolve(filePath);

  // Ensure absolute path
  if (!path.isAbsolute(resolvedPath)) {
    return false;
  }

  // Check against allowed directories
  for (const dir of allowedDirs || []) {
    const resolvedDir = path.resolve(dir);
    if (resolvedPath.startsWith(resolvedDir + path.sep) || resolvedPath === resolvedDir) {
      return true;
    }
  }

  return false;
}

/**
 * Convert weather code to condition
 */
function getWeatherCondition(code) {
  const conditions = {
    0: 'Clear sky',
    1: 'Partly cloudy',
    2: 'Overcast',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail'
  };
  return conditions[code] || 'Unknown';
}

/**
 * Execute a tool by name
 */
async function executeTool(name, ...args) {
  const tool = tools.get(name);

  if (!tool) {
    return { success: false, error: `Tool not found: ${name}` };
  }

  if (!tool.enabled) {
    return { success: false, error: `Tool disabled: ${name}` };
  }

  try {
    return await tool.execute(...args);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Find relevant tool for a request
 */
function findRelevantTool(request) {
  const requestLower = request.toLowerCase();

  for (const [name, tool] of tools) {
    if (!tool.enabled) continue;

    if (tool.name === 'web_search' && /search|find|look up|google/.test(requestLower)) {
      return 'web_search';
    }
    if (tool.name === 'calculator' && /calculate|math|add|subtract|multiply|divide|plus|minus|times|divided by/.test(requestLower)) {
      return 'calculator';
    }
    if (tool.name === 'weather' && /weather|temperature|forecast|hot|cold|rain|snow|sunny|wind/.test(requestLower)) {
      return 'weather';
    }
    if (tool.name === 'file_ops' && /file|read|write|create|save|directory|folder/.test(requestLower)) {
      return 'file_ops';
    }
    if (tool.name === 'code_execution' && /code|execute|run|program|script/.test(requestLower)) {
      return 'code_execution';
    }
  }

  return null;
}

// =====================================================
// MCP Export/Import Utilities
// =====================================================

/**
 * Export MCP tools in standard format
 */
function exportTools() {
  const tools = listTools();
  return {
    version: '1.0.0',
    kind: 'mcp',
    name: 'Adil AI Assistant Tools',
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: {}
    }))
  };
}

/**
 * Import tools in MCP format
 */
function importTools(mcpConfig) {
  const toolsToAdd = mcpConfig.tools || [];
  const imported = [];

  for (const tool of toolsToAdd) {
    // Check if tool already exists
    const existing = getTool(tool.name);
    if (!existing) {
      // Register new tool
      registerTool(tool.name, {
        description: tool.description || '',
        async execute(...args) {
          // Placeholder for MCP tool execution
          return { success: true, result: `MCP tool ${tool.name} executed` };
        }
      });
      imported.push(tool.name);
    }
  }

  return { imported, count: imported.length };
}

/**
 * Execute tool chain (multiple tools sequentially)
 */
async function executeToolChain(toolChain, input) {
  let currentInput = input;
  const results = [];

  for (const toolStep of toolChain) {
    const toolName = toolStep.tool;
    const args = toolStep.args || [];

    // Merge input with args if specified
    let toolArgs = args;
    if (toolStep.useInput && currentInput) {
      toolArgs = [...args, currentInput];
    }

    const result = await executeTool(toolName, ...toolArgs);
    results.push({
      step: toolName,
      input: currentInput,
      result,
      success: result.success !== false
    });

    if (!result.success) {
      break;
    }

    currentInput = result.output || result;
  }

  return {
    success: results.every(r => r.success),
    results,
    output: currentInput
  };
}

/**
 * Find relevant tools for multiple requests
 */
function findRelevantTools(requests) {
  if (!Array.isArray(requests)) {
    requests = [requests];
  }

  const foundTools = new Set();

  for (const request of requests) {
    const requestLower = request.toLowerCase();

    for (const [name, tool] of tools) {
      if (!tool.enabled) continue;

      if (tool.name === 'web_search' && /search|find|look up|google/.test(requestLower)) {
        foundTools.add(name);
      }
      if (tool.name === 'calculator' && /calculate|math|add|subtract|multiply|divide|plus|minus|times|divided by/.test(requestLower)) {
        foundTools.add(name);
      }
      if (tool.name === 'weather' && /weather|temperature|forecast|hot|cold|rain|snow|sunny|wind/.test(requestLower)) {
        foundTools.add(name);
      }
      if (tool.name === 'file_ops' && /file|read|write|create|save|directory|folder/.test(requestLower)) {
        foundTools.add(name);
      }
      if (tool.name === 'code_execution' && /code|execute|run|program|script/.test(requestLower)) {
        foundTools.add(name);
      }
    }
  }

  return Array.from(foundTools);
}

// =====================================================
// Credentials Helper Functions
// =====================================================

/**
 * Get a specific credential from database
 */
async function getCredentials(service, keyName) {
  await db.init();
  return await db.crud.getCredentials(service, keyName);
}

/**
 * Get all credentials for a service
 */
async function listCredentials(service) {
  await db.init();
  return await db.crud.listCredentials(service);
}

/**
 * Save a credential to database
 */
async function saveCredential(service, keyName, value, encrypted) {
  await db.init();
  return await db.crud.saveCredential(service, keyName, value, encrypted);
}

/**
 * Delete a credential from database
 */
async function deleteCredential(service, keyName) {
  await db.init();
  return await db.crud.deleteCredential(service, keyName);
}

// Notion Tool
registerTool('notion', {
  description: "Search Notion pages or query Adil's learning plan database.",
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['search', 'query', 'databaseQuery'], description: 'Action to perform' },
      query: { type: 'string', description: 'Search query (for search action)' },
      databaseId: { type: 'string', description: 'Notion database ID (for query action)' }
    },
    required: ['action'],
    additionalProperties: false
  },
  async execute(params) {
    const action = typeof params === 'string' ? params : (params?.action);
    const resolvedParams = typeof params === 'string' ? {} : (params || {});
    if (!NOTION_TOKEN) return { success: false, error: 'NOTION_TOKEN is not configured.' };

    try {
      if (action === 'search') {
        const query = resolvedParams.query;
        if (!query) return { success: false, error: 'search requires a query string.' };

        const data = await makeRequest('https://api.notion.com/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28'
          },
          body: { query, page_size: 5 }
        });

        return {
          success: true,
          action: 'search',
          results: (data.results || []).map(r => ({
            id: r.id,
            type: r.object,
            title: r.properties?.title?.title?.[0]?.plain_text || r.properties?.Name?.title?.[0]?.plain_text || 'Untitled'
          }))
        };
      }

      if (action === 'query' || action === 'databaseQuery') {
        const dbId = resolvedParams.databaseId || SECTIONS_DB;
        console.log("MCP doing notion query with DB:", dbId, "Token starts with:", NOTION_TOKEN.substring(0, 10));
        const data = await makeRequest(`https://api.notion.com/v1/databases/${dbId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28'
          },
          body: {}
        });
        console.log("Raw notion response data keys:", Object.keys(data), "has results?", !!data.results);
        if (data.object === 'error') console.log("Notion error:", JSON.stringify(data));

        return {
          success: true,
          action: 'databaseQuery',
          results: (data.results || []).map(p => {
            const props = p.properties;
            if (!props) console.log("Missing properties on:", JSON.stringify(p));
            return {
              id: p.id,
              name: props?.['Phases']?.title?.[0]?.plain_text || props?.['Name']?.title?.[0]?.plain_text || 'Unnamed',
              status: props?.['Status']?.status?.name || 'Unknown',
              progress: props?.['Completion Percentage']?.formula?.string || '0%'
            };
          })
        };
      }

      return { success: false, error: `Unsupported action: ${action}. Use 'search' or 'query'.` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
});

/**
 * listToolsForLLM()
 * Returns all enabled tools in OpenAI function-calling format:
 *   [{ type: 'function', function: { name, description, parameters } }]
 * Used by the agentic tool-calling loop.
 */
function listToolsForLLM() {
  return Array.from(tools.entries())
    .filter(([_, t]) => t.enabled !== false)
    .map(([name, t]) => ({
      type: 'function',
      function: {
        name: name,
        description: t.description || '',
        parameters: t.parameters || {
          type: 'object',
          properties: {},
          additionalProperties: true
        }
      }
    }));
}

module.exports = {
  registerTool,
  getTool,
  listTools,
  listToolsForLLM,
  enableTool,
  disableTool,
  executeTool,
  findRelevantTool,
  makeRequest,
  isPathAllowed,
  exportTools,
  importTools,
  executeToolChain,
  findRelevantTools,
  getCredentials,
  listCredentials,
  saveCredential,
  deleteCredential,

  // Tools list
  tools: Array.from(tools.keys())
};
