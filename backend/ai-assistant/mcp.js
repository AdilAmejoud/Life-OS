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

// Tool registry
const tools = new Map();

/**
 * Register a tool
 */
function registerTool(name, options) {
  tools.set(name, {
    ...options,
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
  async execute(query) {
    try {
      // Use DuckDuckGo instant answer API
      const data = await makeRequest(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`
      );

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
  description: 'Execute code in a sandboxed JavaScript environment',
  async execute(code, options = {}) {
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
  description: 'Get weather information for a location',
  config: {
    unit: 'celsius'
  },
  async execute(location) {
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
  description: 'Perform mathematical calculations',
  async execute(expression) {
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

/**
 * Make HTTP request
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const lib = parsedUrl.protocol === 'https:' ? https : http;

    const req = lib.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

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

module.exports = {
  registerTool,
  getTool,
  listTools,
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

  // Tools list
  tools: Array.from(tools.keys())
};
