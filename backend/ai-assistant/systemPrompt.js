/**
 * System Prompt Builder
 * Builds dynamic prompts based on context, user preferences, and configuration.
 */

const db = require('./db');
const fs = require('fs');
const path = require('path');

// Base system prompt
const BASE_PROMPT = `You are Adil's personal AI assistant. Be direct, helpful, and context-aware.

Adil is a software engineer in training based in Rabat, Morocco.
He runs CoderVerse (YouTube + Instagram) — a programming education channel.
He is currently in Phase 1 (Coding - Introduction) at 45% progress.
His goal: become a Software Engineer in 1 year while growing CoderVerse.
He also builds n8n automation workflows (Smart Control System).
Respond in the same language the user uses (Arabic or English).`;

// Current date context
function addDateContext() {
  const now = new Date();
  return `\n\nCurrent date: ${now.toISOString().split('T')[0]}`;
}

// Build system prompt with optional Notion data
async function buildSystemPrompt(options = {}) {
  let prompt = BASE_PROMPT;

  // Add date context
  prompt += addDateContext();

  // Add Notion data if requested
  if (options.includeNotion && options.notionData) {
    prompt += `\n\nLive learning plan from Notion:\n${options.notionData}`;
  }

  // Add memory context if enabled
  if (options.memoryEnabled) {
    const memory = await db.crud.listMemory('fact');
    if (memory.length > 0) {
      prompt += '\n\nKey facts about Adil:\n';
      memory.forEach(m => {
        if (typeof m.value === 'string') {
          prompt += `- ${m.key}: ${m.value}\n`;
        }
      });
    }
  }

  // Add user preferences
  const config = await db.crud.getMemory('config', 'main');
  if (config && config.value) {
    prompt += '\n\nYour configuration:\n';
    if (config.value.auto_task_extraction) {
      prompt += '- Automatically extract and create tasks from user requests\n';
    }
    if (config.value.n8n_enabled) {
      prompt += '- Can trigger n8n workflows when appropriate\n';
    }
  }

  // Add conversation-specific context
  if (options.conversationId) {
    prompt += `\n\nYou are in conversation ID: ${options.conversationId}`;
  }

  return prompt;
}

// Build prompt for task extraction
async function buildTaskExtractionPrompt(userMessage) {
  const config = await db.crud.getMemory('config', 'main');
  const memory = await db.crud.listMemory('fact');

  return `Extract any tasks from the following message. A task is a clear action item that needs to be done.

User Message:
"${userMessage}"

Return the result as a JSON array with objects containing: title, description, priority, due_date (ISO format if mentioned).

Current user context:
${memory.length > 0 ? memory.map(m => `${m.key}: ${typeof m.value === 'string' ? m.value : JSON.stringify(m.value)}`).join('\n') : 'No specific context available'}

Configuration: ${config ? JSON.stringify(config.value) : '{}'}

Return ONLY valid JSON, no other text.`;
}

// Build prompt for n8n workflow suggestion
async function buildN8nSuggestionPrompt(userMessage) {
  const workflows = await db.crud.listWorkflows();

  let prompt = `User wants to know about n8n workflows:\n"${userMessage}"\n\n`;

  if (workflows.length > 0) {
    prompt += `Available workflows:\n`;
    workflows.forEach(w => {
      prompt += `- ${w.name} (ID: ${w.workflow_id})\n`;
    });
    prompt += `\nSuggest which workflow (if any) would be appropriate.`;
  } else {
    prompt += `No workflows are currently configured. Suggest what kind of workflow might help.`;
  }

  return prompt;
}

// Build prompt for MCP tool selection
async function buildMcpSelectionPrompt(userMessage, availableTools) {
  return `User request: "${userMessage}"

Available tools:
${availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Which tool(s) should be used to help with this request? Return JSON array of tool names.`;
}

// Learn from conversation
async function extractFactsFromConversation(messages) {
  const facts = [];
  const pattern = /(?:my|I am|I'm|I've|I work|I run|I'm currently)\s+(.+)/gi;

  messages.forEach(msg => {
    if (msg.role === 'user') {
      const matches = msg.content.matchAll(pattern);
      for (const match of matches) {
        facts.push({
          key: match[1].toLowerCase().replace(/\.?$/, ''),
          value: match[1],
          type: 'fact'
        });
      }
    }
  });

  return facts;
}

// Save learned facts
async function saveLearnedFacts(facts) {
  for (const fact of facts) {
    await db.crud.setMemory(fact.type, fact.key, fact.value);
  }
  return facts.length;
}

// Check if message contains actionable task
async function shouldExtractTask(message) {
  const triggers = [
    'create a task',
    'add to tasks',
    'remind me',
    'schedule',
    'due',
    'deadline',
    'complete',
    'do this',
    'help me with'
  ];

  const lower = message.toLowerCase();
  return triggers.some(trigger => lower.includes(trigger));
}

// Build contextual response prompt
async function buildContextualResponsePrompt(userMessage, conversationId) {
  const messages = await db.crud.getMessageHistory(conversationId);
  const recentMessages = messages.slice(-6); // Last 6 messages (12 turns)
  const config = await db.crud.getMemory('config', 'main');

  let prompt = `Previous conversation context:\n`;
  recentMessages.forEach(m => {
    const roleLabel = m.role === 'system' ? 'System' : m.role.charAt(0).toUpperCase() + m.role.slice(1);
    prompt += `${roleLabel}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}\n`;
  });

  prompt += `\nCurrent request: "${userMessage}"\n`;

  if (config && config.value.auto_task_extraction) {
    prompt += `If this request contains an actionable task, automatically create it.\n`;
  }

  if (config && config.value.n8n_enabled) {
    prompt += `Consider if an n8n workflow could help with this request.\n`;
  }

  return prompt;
}

// =====================================================
// Instructions Integration
// =====================================================

const instructions = require('./instructions');

/**
 * Build prompt with active instructions injected
 */
async function buildPromptWithInstructions(basePrompt, options = {}) {
  let prompt = basePrompt || BASE_PROMPT;

  // Get active instructions
  const activeInstructions = await instructions.getActiveInstructions();

  if (activeInstructions.length > 0) {
    prompt += '\n\n--- CUSTOM INSTRUCTIONS ---\n';
    activeInstructions.forEach(inst => {
      prompt += `[${inst.name}] (priority: ${inst.priority})\n`;
      prompt += `${inst.content}\n\n`;
    });
    prompt += '--- END CUSTOM INSTRUCTIONS ---\n\n';
  }

  return prompt;
}

// =====================================================
// User Data Integration
// =====================================================

const userData = require('./userData');

/**
 * Extract user data (facts, preferences) from conversation
 */
async function extractUserData(messages) {
  const allData = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      const data = userData.extractUserDataFromMessage(msg.content);
      allData.push(...data);
    }
  }

  return allData;
}

/**
 * Extract user data with confidence scoring
 */
async function extractUserDataWithConfidence(messages) {
  const allData = await extractUserData(messages);

  // Group by category and key
  const grouped = {};
  allData.forEach(item => {
    const key = `${item.category}:${item.key}`;
    if (!grouped[key]) {
      grouped[key] = {
        category: item.category,
        key: item.key,
        values: [],
        totalConfidence: 0
      };
    }
    grouped[key].values.push(item.value);
    grouped[key].totalConfidence += item.confidence;
  });

  // Compute final values with max confidence
  const finalData = [];
  for (const key in grouped) {
    const item = grouped[key];
    const bestValue = item.values[0]; // Use first value (could be enhanced with voting)
    const avgConfidence = item.totalConfidence / item.values.length;

    finalData.push({
      category: item.category,
      key: item.key,
      value: bestValue,
      confidence: Math.min(avgConfidence, 1.0)
    });
  }

  return finalData;
}

/**
 * Save learned user data from conversation
 */
async function saveLearnedUserData(dataItems) {
  const results = await userData.bulkStoreUserData(dataItems);
  return results;
}

/**
 * Get user profile summary
 */
async function getUserProfile() {
  return await userData.getProfileSummary();
}

// =====================================================
// Enhanced Fact Extraction
// =====================================================

/**
 * Enhanced fact extraction with better patterns
 */
function extractFactsFromConversation(messages) {
  const facts = [];
  const patterns = {
    name: /(?:my\s+name\s+(?:is|is\s+)|i\s+am\s+(?:known\s+as|go\s+by))\s+([A-Z][a-z]+)/gi,
    location: /i(?:'?m| am|'m| am from| live in|reside in|stay in|stay at|are from|from)\s+([^.!?]+)/gi,
    job: /i\s+(?:work(?:s)?\s+at|work for|am\s+a|am\s+an|am\s+working\s+at)\s+([^.!?]+)/gi,
    role: /i\s+(?:am\s+a|am\s+an|am\s+the|work\s+as|work\s+as\s+a)\s+([^.!?]+)/gi,
    email: /my\s+email\s+(?:is|address|is\s+)\s*[:\s]*\s*([^\s]+)/gi,
    website: /(?:my|the)\s+(?:website|url|portfolio)\s+(?:is|at)\s+(https?:\/\/[^\s]+)/gi,
    social: /(?:my|my\s+)(@\w+)\s+(?:handle|username|twitter|instagram|github)/gi
  };

  messages.forEach(msg => {
    if (msg.role === 'user') {
      // Extract using pattern matching
      for (const [type, pattern] of Object.entries(patterns)) {
        const matches = msg.content.matchAll(pattern);
        for (const match of matches) {
          let value = match[1];
          let key = type;

          // Handle social handles specially
          if (type === 'social') {
            const platform = msg.content.match(/(twitter|instagram|github)/i)?.[0] || 'social';
            key = `social_${platform.toLowerCase()}`;
          }

          // Clean up the value
          value = value.replace(/[.,;:]$/, '').trim();

          if (value) {
            facts.push({
              key,
              value,
              type: 'fact',
              confidence: 0.85,
              source: 'pattern_match'
            });
          }
        }
      }

      // Generic "I am..." patterns
      const genericMatches = msg.content.matchAll(/i\s+am\s+([^.!?]+)/gi);
      for (const match of genericMatches) {
        const value = match[1].trim();
        // Skip if it's already captured by specific patterns
        if (value.length > 5 && value.length < 100) {
          facts.push({
            key: `description_${Date.now()}`,
            value,
            type: 'fact',
            confidence: 0.6,
            source: 'generic_pattern'
          });
        }
      }
    }
  });

  return facts;
}

/**
 * Save learned facts with deduplication
 */
async function saveLearnedFacts(facts) {
  let savedCount = 0;

  for (const fact of facts) {
    // Check if fact already exists with similar value
    const existing = await db.crud.getUserData('fact', fact.key);
    if (!existing || existing.value !== fact.value) {
      await db.crud.createOrUpdateUserData(
        'fact',
        fact.key,
        fact.value,
        fact.confidence || 1.0
      );
      savedCount++;
    }
  }

  return savedCount;
}

module.exports = {
  buildSystemPrompt,
  buildTaskExtractionPrompt,
  buildN8nSuggestionPrompt,
  buildMcpSelectionPrompt,
  extractFactsFromConversation,
  saveLearnedFacts,
  shouldExtractTask,
  buildContextualResponsePrompt,
  buildPromptWithInstructions,
  extractUserData,
  extractUserDataWithConfidence,
  saveLearnedUserData,
  getUserProfile,

  // Constants
  BASE_PROMPT
};
