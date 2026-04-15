/**
 * Orchestrator Module
 * Coordinates multi-tool orchestration for complex task execution.
 */

const db = require('./db');
const mcp = require('./mcp');
const skills = require('./skills');

/**
 * Tool orchestration result
 */
class OrchestratorResult {
  constructor() {
    this.steps = [];
    this.success = true;
    this.errors = [];
    this.output = null;
    this.metadata = {};
  }

  addStep(name, result) {
    this.steps.push({
      name,
      success: result.success !== false,
      result,
      timestamp: Date.now()
    });

    if (!result.success) {
      this.success = false;
      this.errors.push({
        step: name,
        error: result.error || 'Unknown error'
      });
    }
  }

  toJSON() {
    return {
      success: this.success,
      steps: this.steps,
      errors: this.errors,
      output: this.output,
      metadata: this.metadata
    };
  }
}

/**
 * Execute a single tool by name
 */
async function executeTool(toolName, args) {
  // Check MCP tools first
  const mcpTool = mcp.getTool(toolName);
  if (mcpTool && mcpTool.enabled) {
    return await mcp.executeTool(toolName, ...(args || []));
  }

  // Check skills
  const skill = await db.crud.getSkillByName(toolName);
  if (skill && skill.enabled) {
    return await skills.executeSkillById(skill.id, args);
  }

  return { success: false, error: `Tool not found: ${toolName}` };
}

/**
 * Chain tools together
 */
async function chainTools(toolChain, input) {
  const result = new OrchestratorResult();
  let currentInput = input;

  for (const toolConfig of toolChain) {
    const toolName = toolConfig.tool;
    const args = toolConfig.args || [];

    // Merge input with args if specified
    let toolArgs = args;
    if (toolConfig.useInput && currentInput) {
      toolArgs = [...args, currentInput];
    }

    const toolResult = await executeTool(toolName, toolArgs);
    result.addStep(toolName, toolResult);

    if (!toolResult.success) {
      break;
    }

    // Pass output to next tool
    currentInput = toolResult.output || toolResult;
  }

  if (result.success) {
    result.output = currentInput;
  }

  return result;
}

/**
 * Execute tools in parallel
 */
async function parallelTools(toolConfigs) {
  const result = new OrchestratorResult();
  const promises = [];

  for (const toolConfig of toolConfigs) {
    const toolName = toolConfig.tool;
    const args = toolConfig.args || [];

    const promise = executeTool(toolName, args)
      .then(toolResult => {
        result.addStep(toolName, toolResult);
        return toolResult;
      })
      .catch(err => {
        result.addStep(toolName, { success: false, error: err.message });
        return { success: false, error: err.message };
      });

    promises.push(promise);
  }

  await Promise.all(promises);
  return result;
}

/**
 * Conditional tool execution
 */
async function conditionalTools(conditions, input) {
  const result = new OrchestratorResult();
  let currentInput = input;

  for (const condition of conditions) {
    // Check condition
    const conditionMet = await evaluateCondition(condition.when, currentInput);

    if (conditionMet) {
      const toolResult = await executeTool(condition.then.tool, condition.then.args || []);
      result.addStep(condition.then.tool, toolResult);

      if (!toolResult.success) {
        break;
      }

      currentInput = toolResult.output || currentInput;
    } else if (condition.else) {
      const toolResult = await executeTool(condition.else.tool, condition.else.args || []);
      result.addStep(condition.else.tool, toolResult);

      if (!toolResult.success) {
        break;
      }

      currentInput = toolResult.output || currentInput;
    }
  }

  result.output = currentInput;
  return result;
}

/**
 * Evaluate a condition
 */
async function evaluateCondition(condition, input) {
  if (typeof condition === 'function') {
    return condition(input);
  }

  if (typeof condition === 'string') {
    // Simple string-based condition
    if (condition.startsWith('has:')) {
      const key = condition.slice(4);
      return input && input[key] !== undefined;
    }

    if (condition.startsWith('is:')) {
      const expected = condition.slice(3);
      return String(input) === expected;
    }

    if (condition.startsWith('regex:')) {
      const pattern = new RegExp(condition.slice(6));
      return pattern.test(String(input));
    }

    // Fallback: try to evaluate as boolean
    try {
      return Boolean(eval(condition));
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Find relevant tools for a request
 */
async function findRelevantTools(request) {
  const relevantMcp = [];

  // Check MCP tools
  const mcpTools = mcp.listTools();
  for (const tool of mcpTools) {
    if (!tool.enabled) continue;

    const requestLower = request.toLowerCase();

    if (tool.name === 'web_search' && /search|find|look up|google/.test(requestLower)) {
      relevantMcp.push(tool.name);
    }
    if (tool.name === 'calculator' && /calculate|math|add|subtract|multiply|divide|plus|minus|times|divided by/.test(requestLower)) {
      relevantMcp.push(tool.name);
    }
    if (tool.name === 'weather' && /weather|temperature|forecast|hot|cold|rain|snow|sunny|wind/.test(requestLower)) {
      relevantMcp.push(tool.name);
    }
    if (tool.name === 'file_ops' && /file|read|write|create|save|directory|folder/.test(requestLower)) {
      relevantMcp.push(tool.name);
    }
    if (tool.name === 'code_execution' && /code|execute|run|program|script/.test(requestLower)) {
      relevantMcp.push(tool.name);
    }
  }

  // Check skills
  const skillsList = await db.crud.listSkills(true);
  const relevantSkills = [];

  for (const skill of skillsList) {
    if (skill.description) {
      const descLower = skill.description.toLowerCase();
      if (requestLower => descLower || descLower.includes(requestLower)) {
        relevantSkills.push(skill.name);
      }
    }
  }

  return {
    mcpTools: relevantMcp,
    skills: relevantSkills
  };
}

/**
 * Execute tools based on intent
 */
async function executeByIntent(intent, request) {
  const result = new OrchestratorResult();

  switch (intent) {
    case 'search':
      if (request) {
        const searchResult = await executeTool('web_search', [request]);
        result.addStep('web_search', searchResult);
        if (searchResult.success) {
          result.output = searchResult;
        }
      }
      break;

    case 'calculate':
      const calcResult = await executeTool('calculator', [request]);
      result.addStep('calculator', calcResult);
      if (calcResult.success) {
        result.output = calcResult;
      }
      break;

    case 'weather':
      const weatherResult = await executeTool('weather', [request]);
      result.addStep('weather', weatherResult);
      if (weatherResult.success) {
        result.output = weatherResult;
      }
      break;

    case 'file':
      const fileResult = await executeTool('file_ops', [request]);
      result.addStep('file_ops', fileResult);
      if (fileResult.success) {
        result.output = fileResult;
      }
      break;

    default:
      result.errors.push({ step: 'intent', error: `Unknown intent: ${intent}` });
      result.success = false;
  }

  return result;
}

/**
 * Create a tool orchestration plan
 */
function createOrchestrationPlan(steps) {
  return {
    steps: steps.map((step, index) => ({
      id: index + 1,
      tool: step.tool,
      args: step.args || [],
      description: step.description || ''
    })),
    metadata: {
      createdAt: new Date().toISOString(),
      stepCount: steps.length
    }
  };
}

/**
 * Save orchestration plan to database
 */
async function saveOrchestrationPlan(name, plan) {
  const existing = await db.crud.getSkillByName(name);
  if (existing) {
    return { error: `Orchestration "${name}" already exists. Use a different name.` };
  }

  const skillConfig = {
    orchestration: {
      name,
      plan,
      version: '1.0.0'
    }
  };

  const result = await db.crud.createSkill(
    name,
    `Orchestration: ${plan.metadata.stepCount} steps`,
    'javascript',
    `// Orchestration: ${name}\n// See config for plan\nconst config = ${JSON.stringify(skillConfig.config, null, 2)};`,
    skillConfig
  );

  return result;
}

/**
 * Execute a saved orchestration plan
 */
async function executeOrchestration(name, input) {
  const skill = await db.crud.getSkillByName(name);
  if (!skill) {
    return { success: false, error: `Orchestration "${name}" not found` };
  }

  const plan = skill.config?.orchestration?.plan;
  if (!plan) {
    return { success: false, error: 'Orchestration plan not found' };
  }

  // Execute steps
  let currentInput = input;

  for (const step of plan.steps) {
    const toolResult = await executeTool(step.tool, step.args || []);
    if (!toolResult.success) {
      return {
        success: false,
        error: toolResult.error,
        step: step.id,
        input: currentInput
      };
    }
    currentInput = toolResult.output || currentInput;
  }

  return {
    success: true,
    output: currentInput
  };
}

module.exports = {
  OrchestratorResult,
  executeTool,
  chainTools,
  parallelTools,
  conditionalTools,
  evaluateCondition,
  findRelevantTools,
  executeByIntent,
  createOrchestrationPlan,
  saveOrchestrationPlan,
  executeOrchestration,

  // Types
  type: 'orchestrator'
};
