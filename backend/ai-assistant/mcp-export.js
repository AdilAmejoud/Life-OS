/**
 * MCP Export/Import Utilities
 * Handles skill import/export in MCP (Model Context Protocol) format.
 */

const fs = require('fs');
const path = require('path');

const db = require('./db');

// MCP Schema version
const MCP_VERSION = '1.0.0';

/**
 * Export all skills as MCP JSON format
 */
async function exportSkillsAsMCP(enabledOnly = true) {
  const skillsList = await db.crud.listSkills(enabledOnly);
  const javascriptSkills = await db.crud.listSkills(enabledOnly, 'javascript');

  // Build MCP-compliant tool list
  const tools = skillsList.map(skill => ({
    name: skill.name,
    description: skill.description || '',
    parameters: skill.config?.parameters || skill.config?.mcp?.parameters || {}
  }));

  // Build skill definitions
  const skillDefinitions = skillsList.map(skill => ({
    id: skill.id,
    name: skill.name,
    type: 'mcp',
    description: skill.description,
    config: skill.config
  }));

  const mcpExport = {
    version: MCP_VERSION,
    kind: 'mcp',
    name: 'Adil AI Assistant Skills',
    skills: skillDefinitions,
    javascriptSkills: javascriptSkills.map(s => ({
      id: s.id,
      name: s.name,
      type: 'javascript',
      description: s.description,
      code: s.code,
      config: s.config
    })),
    tools: tools,
    exportedAt: new Date().toISOString()
  };

  return mcpExport;
}

/**
 * Export skills as MCP JSON string
 */
async function exportSkillsAsJSON(enabledOnly = true) {
  const mcp = await exportSkillsAsMCP(enabledOnly);
  return JSON.stringify(mcp, null, 2);
}

/**
 * Import skills from MCP format
 */
async function importSkillsFromMCP(mcpData) {
  const result = {
    imported: [],
    errors: [],
    warnings: []
  };

  // Handle both object and JSON string input
  let data = mcpData;
  if (typeof mcpData === 'string') {
    try {
      data = JSON.parse(mcpData);
    } catch (err) {
      return { error: `Invalid MCP JSON: ${err.message}` };
    }
  }

  // Validate MCP format
  if (!data.version) {
    result.warnings.push('Missing version field, assuming MCP v1.0.0');
  }

  // Import MCP skills
  const skillsToImport = data.skills || data.tools || [];
  const mcpSkills = skillsToImport.filter(s => s.type !== 'javascript');

  for (const skill of mcpSkills) {
    try {
      // Create MCP skill
      const skillData = {
        name: skill.name,
        description: skill.description || '',
        type: 'mcp',
        config: {
          mcp: {
            name: skill.name,
            description: skill.description,
            parameters: skill.parameters || {}
          }
        }
      };

      const resultItem = await db.crud.createSkill(
        skillData.name,
        skillData.description,
        skillData.type,
        null, // No code for MCP skills
        skillData.config
      );

      if (resultItem.error) {
        result.errors.push({
          name: skill.name,
          error: resultItem.error
        });
      } else {
        result.imported.push({
          id: resultItem.id,
          name: skill.name,
          type: 'mcp'
        });
      }
    } catch (err) {
      result.errors.push({
        name: skill.name,
        error: err.message
      });
    }
  }

  // Import JavaScript skills
  const jsSkills = data.javascriptSkills || [];
  for (const skill of jsSkills) {
    try {
      const resultItem = await db.crud.createSkill(
        skill.name,
        skill.description || '',
        'javascript',
        skill.code || null,
        skill.config || null
      );

      if (resultItem.error) {
        result.errors.push({
          name: skill.name,
          error: resultItem.error
        });
      } else {
        result.imported.push({
          id: resultItem.id,
          name: skill.name,
          type: 'javascript'
        });
      }
    } catch (err) {
      result.errors.push({
        name: skill.name,
        error: err.message
      });
    }
  }

  return result;
}

/**
 * Import skills from JSON file
 */
async function importSkillsFromFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    const content = fs.readFileSync(absolutePath, 'utf8');

    return await importSkillsFromMCP(content);
  } catch (err) {
    return { error: `Failed to read file: ${err.message}` };
  }
}

/**
 * Export skills to JSON file
 */
async function exportSkillsToFile(filePath, enabledOnly = true) {
  try {
    const mcp = await exportSkillsAsMCP(enabledOnly);
    const json = JSON.stringify(mcp, null, 2);

    const absolutePath = path.resolve(filePath);
    const dirPath = path.dirname(absolutePath);

    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(absolutePath, json, 'utf8');

    return { success: true, path: absolutePath, size: json.length };
  } catch (err) {
    return { error: `Failed to write file: ${err.message}` };
  }
}

/**
 * Get MCP schema for validation
 */
function getMCP_SCHEMA() {
  return {
    version: 'string',
    kind: 'string',
    name: 'string',
    skills: [
      {
        id: 'number',
        name: 'string',
        type: 'string',
        description: 'string',
        config: 'object'
      }
    ],
    tools: [
      {
        name: 'string',
        description: 'string',
        parameters: 'object'
      }
    ]
  };
}

/**
 * Validate MCP data structure
 */
function validateMCPData(data) {
  const errors = [];
  const warnings = [];

  // Check version
  if (!data.version) {
    warnings.push('Missing version field');
  }

  // Check kind
  if (data.kind && data.kind !== 'mcp') {
    warnings.push(`Unexpected kind: ${data.kind}`);
  }

  // Validate skills
  const skills = data.skills || [];
  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    if (!skill.name) {
      errors.push(`Skill ${i}: missing name`);
    }
    if (!skill.type) {
      errors.push(`Skill ${i}: missing type`);
    }
    if (!skill.config && skill.type === 'mcp') {
      errors.push(`Skill ${i}: missing config for MCP skill`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Convert MCP tools to skills format
 */
function convertMCPCTools(tools) {
  if (!Array.isArray(tools)) {
    tools = [tools];
  }

  return tools.map(tool => ({
    name: tool.name,
    description: tool.description || '',
    type: 'mcp',
    config: {
      mcp: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters || {}
      }
    }
  }));
}

/**
 * Merge imported skills with existing ones
 */
async function mergeImportedSkills(newSkills, options = {}) {
  const { overwrite = false } = options;

  const result = {
    imported: [],
    skipped: [],
    updated: [],
    errors: []
  };

  for (const skill of newSkills) {
    const existing = await db.crud.getSkillByName(skill.name);

    if (existing) {
      if (overwrite) {
        try {
          await db.crud.updateSkill(existing.id, {
            description: skill.description,
            config: skill.config,
            enabled: skill.enabled !== false
          });
          result.updated.push({
            id: existing.id,
            name: skill.name,
            action: 'updated'
          });
        } catch (err) {
          result.errors.push({
            name: skill.name,
            error: err.message
          });
        }
      } else {
        result.skipped.push({
          name: skill.name,
          reason: 'already exists'
        });
      }
    } else {
      try {
        const created = await db.crud.createSkill(
          skill.name,
          skill.description,
          skill.type || 'mcp',
          skill.code || null,
          skill.config || null
        );
        result.imported.push({
          id: created.id,
          name: skill.name,
          action: 'created'
        });
      } catch (err) {
        result.errors.push({
          name: skill.name,
          error: err.message
        });
      }
    }
  }

  return result;
}

module.exports = {
  exportSkillsAsMCP,
  exportSkillsAsJSON,
  importSkillsFromMCP,
  importSkillsFromFile,
  exportSkillsToFile,
  getMCP_SCHEMA,
  validateMCPData,
  convertMCPCTools,
  mergeImportedSkills,
  MCP_VERSION
};
