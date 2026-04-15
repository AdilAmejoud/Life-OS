const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.AI_ASSISTANT_DB_PATH || path.join(__dirname, 'data', 'conversations.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

// Get schema version
function getSchemaVersion() {
  return new Promise((resolve, reject) => {
    db.get(
      `PRAGMA user_version`,
      [],
      (err, row) => {
        if (err) return reject(err);
        resolve(row.user_version || 0);
      }
    );
  });
}

// Set schema version
function setSchemaVersion(version) {
  return new Promise((resolve, reject) => {
    db.run(`PRAGMA user_version = ${version}`, (err) => {
      if (err) return reject(err);
      resolve(version);
    });
  });
}

// Migration for schema version 2
function migrateToV2() {
  console.log('Running migration to schema version 2...');
  return new Promise((resolve, reject) => {
    const migrations = [
      // Instructions table
      `CREATE TABLE IF NOT EXISTS instructions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        enabled INTEGER DEFAULT 1,
        priority INTEGER DEFAULT 50,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Skills table
      `CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'javascript' CHECK(type IN ('javascript', 'mcp')),
        code TEXT,
        config TEXT,
        enabled INTEGER DEFAULT 1,
        version TEXT DEFAULT '1.0.0',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // User data table
      `CREATE TABLE IF NOT EXISTS user_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, key)
      )`,

      // Skill usage table
      `CREATE TABLE IF NOT EXISTS skill_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        skill_id INTEGER NOT NULL,
        conversation_id INTEGER,
        message_id INTEGER,
        success INTEGER DEFAULT 1,
        execution_time_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (skill_id) REFERENCES skills(id),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id),
        FOREIGN KEY (message_id) REFERENCES messages(id)
      )`
    ];

    let completed = 0;
    let errors = [];

    migrations.forEach((query, index) => {
      db.run(query, (err) => {
        if (err) {
          console.error(`Migration error for table ${index}: ${err.message}`);
          errors.push(err);
        }
        completed++;
        if (completed === migrations.length) {
          if (errors.length > 0) {
            reject(new Error(errors.map(e => e.message).join(', ')));
          } else {
            console.log('Schema version 2 migration completed');
            resolve();
          }
        }
      });
    });
  });
}

function init() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(new Error(`Cannot open database: ${err.message}`));
        return;
      }
      console.log(`Connected to SQLite database at ${DB_PATH}`);

      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');

      // Check schema version and run migrations if needed
      getSchemaVersion()
        .then((currentVersion) => {
          console.log(`Current schema version: ${currentVersion}`);
          if (currentVersion < SCHEMA_VERSION) {
            console.log(`Schema needs update: ${currentVersion} -> ${SCHEMA_VERSION}`);
            if (currentVersion < 2) {
              return migrateToV2();
            }
          }
          return Promise.resolve();
        })
        .then(() => {
          // Create tables (idempotent)
          createTables(resolve, reject);
        })
        .catch(reject);
    });
  });
}

// Schema version for migrations
const SCHEMA_VERSION = 2;

function createTables(resolve, reject) {
  const queries = [
    // Conversations table
    `CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_archived INTEGER DEFAULT 0,
      model TEXT,
      max_tokens INTEGER DEFAULT 512
    )`,

    // Messages table
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant')),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      tokens INTEGER,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )`,

    // Tasks table
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER,
      message_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in-progress', 'completed', 'cancelled')),
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      due_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (message_id) REFERENCES messages(id)
    )`,

    // Memory table
    `CREATE TABLE IF NOT EXISTS memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('fact', 'preference', 'history', 'task')),
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(type, key)
    )`,

    // Chat sessions for multi-tab support
    `CREATE TABLE IF NOT EXISTS chat_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      conversation_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )`,

    // n8n workflows table
    `CREATE TABLE IF NOT EXISTS n8n_workflows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      webhook_url TEXT,
      status TEXT DEFAULT 'active',
      last_triggered DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // MCP tools table
    `CREATE TABLE IF NOT EXISTS mcp_tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      enabled INTEGER DEFAULT 1,
      config TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Instructions table - Phase 1: Store custom AI behavior instructions
    `CREATE TABLE IF NOT EXISTS instructions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      enabled INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 50,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Skills table - Phase 1: Store user-defined skills
    `CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'javascript' CHECK(type IN ('javascript', 'mcp')),
      code TEXT,
      config TEXT,
      enabled INTEGER DEFAULT 1,
      version TEXT DEFAULT '1.0.0',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // User data table - Phase 1: Store personal data about Adil
    `CREATE TABLE IF NOT EXISTS user_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      confidence REAL DEFAULT 1.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(category, key)
    )`,

    // Skill usage table - Phase 1: Track skill usage for analytics
    `CREATE TABLE IF NOT EXISTS skill_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      skill_id INTEGER NOT NULL,
      conversation_id INTEGER,
      message_id INTEGER,
      success INTEGER DEFAULT 1,
      execution_time_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (skill_id) REFERENCES skills(id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (message_id) REFERENCES messages(id)
    )`
  ];

  let completed = 0;
  let errors = [];

  queries.forEach((query, index) => {
    db.run(query, (err) => {
      if (err) {
        console.error(`Error creating table ${index}: ${err.message}`);
        errors.push(err);
      }
      completed++;
      if (completed === queries.length) {
        if (errors.length > 0) {
          reject(new Error(errors.map(e => e.message).join(', ')));
        } else {
          console.log('All tables created successfully');
          resolve(db);
        }
      }
    });
  });
}

// Initialize default MCP tools
function initMcpTools(resolve, reject) {
  const tools = [
    { name: 'web_search', description: 'Search the web for information', config: JSON.stringify({ engine: 'duckduckgo' }) },
    { name: 'code_execution', description: 'Execute code in sandboxed environment', config: JSON.stringify({ language: 'javascript' }) },
    { name: 'file_ops', description: 'Read, write, and manage files', config: JSON.stringify({ allowed_dirs: ['/app'] }) },
    { name: 'weather', description: 'Get weather information', config: JSON.stringify({ unit: 'celsius' }) },
    { name: 'calculator', description: 'Mathematical calculations', config: JSON.stringify({}) }
  ];

  let completed = 0;
  tools.forEach(tool => {
    db.run(
      `INSERT OR IGNORE INTO mcp_tools (name, description, config) VALUES (?, ?, ?)`,
      [tool.name, tool.description, tool.config],
      () => {
        completed++;
        if (completed === tools.length) {
          resolve(db);
        }
      }
    );
  });
}

// Initialize default configuration
function initConfig(resolve, reject) {
  const config = {
    auto_task_extraction: true,
    memory_enabled: true,
    n8n_enabled: true,
    model: process.env.OLLAMA_MODEL || 'qwen3.5:9b',
    ollama_host: process.env.OLLAMA_HOST || 'host.docker.internal',
    ollama_port: parseInt(process.env.OLLAMA_PORT || '11434')
  };

  db.run(
    `INSERT OR IGNORE INTO memory (type, key, value) VALUES (?, ?, ?)`,
    ['config', 'main', JSON.stringify(config)],
    () => {
      resolve(db);
    }
  );
}

// Initialize default conversation
function initDefaultConversation(resolve, reject) {
  db.run(
    `INSERT OR IGNORE INTO conversations (title, model) VALUES (?, ?)`,
    ['Welcome Chat', process.env.OLLAMA_MODEL || 'qwen3.5:9b'],
    function (err) {
      if (err) {
        console.warn('Could not create default conversation:', err.message);
      }
      resolve(db);
    }
  );
}

// Get database instance
function getDb() {
  return db;
}

module.exports = {
  init,
  getDb,
  sqlite3
};

// Export CRUD operations
module.exports.crud = {
  // Conversations
  createConversation: (title, model) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO conversations (title, model) VALUES (?, ?)`,
        [title, model],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, title, model });
        }
      );
    });
  },

  getConversation: (id) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM conversations WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  },

  listConversations: (limit = 50, offset = 0) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM conversations WHERE is_archived = 0 ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  },

  updateConversation: (id, updates) => {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
      if (fields.length === 0) return resolve(null);
      values.push(id);
      db.run(
        `UPDATE conversations SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
        function (err) {
          if (err) return reject(err);
          resolve({ id, ...updates });
        }
      );
    });
  },

  deleteConversation: (id) => {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM conversations WHERE id = ?`,
        [id],
        function (err) {
          if (err) return reject(err);
          resolve({ affected: this.changes });
        }
      );
    });
  },

  // Messages
  createMessage: (conversationId, role, content, tokens) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO messages (conversation_id, role, content, tokens) VALUES (?, ?, ?, ?)`,
        [conversationId, role, content, tokens || null],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, conversationId, role, content });
        }
      );
    });
  },

  getMessages: (conversationId, limit = 100) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?`,
        [conversationId, limit],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  },

  getMessageHistory: (conversationId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
        [conversationId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  },

  // Tasks
  createTask: (conversationId, messageId, title, description, priority, dueDate) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO tasks (conversation_id, message_id, title, description, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [conversationId, messageId, title, description || null, priority || 'medium', dueDate || null],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, title, description, priority });
        }
      );
    });
  },

  getTask: (id) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM tasks WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  },

  listTasks: (status, limit = 50) => {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM tasks`;
      const params = [];
      if (status) {
        query += ` WHERE status = ?`;
        params.push(status);
      }
      query += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);
      db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  updateTask: (id, updates) => {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
      if (fields.length === 0) return resolve(null);
      values.push(id);
      db.run(
        `UPDATE tasks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
        function (err) {
          if (err) return reject(err);
          resolve({ id, ...updates });
        }
      );
    });
  },

  deleteTask: (id) => {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM tasks WHERE id = ?`,
        [id],
        function (err) {
          if (err) return reject(err);
          resolve({ affected: this.changes });
        }
      );
    });
  },

  // Memory
  getMemory: (type, key) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM memory WHERE type = ? AND key = ?`,
        [type, key],
        (err, row) => {
          if (err) return reject(err);
          if (row) {
            try {
              row.value = JSON.parse(row.value);
            } catch { /* value is not JSON */ }
          }
          resolve(row);
        }
      );
    });
  },

  setMemory: (type, key, value) => {
    return new Promise((resolve, reject) => {
      const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
      db.run(
        `INSERT OR REPLACE INTO memory (type, key, value) VALUES (?, ?, ?)`,
        [type, key, serialized],
        function (err) {
          if (err) return reject(err);
          resolve({ type, key, value });
        }
      );
    });
  },

  listMemory: (type) => {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM memory`;
      const params = [];
      if (type) {
        query += ` WHERE type = ?`;
        params.push(type);
      }
      query += ` ORDER BY updated_at DESC`;
      db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        // Parse JSON values
        rows.forEach(row => {
          try {
            row.value = JSON.parse(row.value);
          } catch { /* not JSON */ }
        });
        resolve(rows);
      });
    });
  },

  deleteMemory: (type, key) => {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM memory WHERE type = ? AND key = ?`,
        [type, key],
        function (err) {
          if (err) return reject(err);
          resolve({ affected: this.changes });
        }
      );
    });
  },

  // n8n Workflows
  getWorkflow: (workflowId) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM n8n_workflows WHERE workflow_id = ?`,
        [workflowId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  },

  listWorkflows: () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM n8n_workflows ORDER BY created_at DESC`,
        [],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  },

  saveWorkflow: (workflowId, name, webhookUrl) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO n8n_workflows (workflow_id, name, webhook_url) VALUES (?, ?, ?)`,
        [workflowId, name, webhookUrl],
        function (err) {
          if (err) return reject(err);
          resolve({ workflowId, name, webhookUrl });
        }
      );
    });
  },

  deleteWorkflow: (workflowId) => {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM n8n_workflows WHERE workflow_id = ?`,
        [workflowId],
        function (err) {
          if (err) return reject(err);
          resolve({ affected: this.changes });
        }
      );
    });
  },

  // MCP Tools
  getMcpTool: (name) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM mcp_tools WHERE name = ?`,
        [name],
        (err, row) => {
          if (err) return reject(err);
          if (row && row.config) {
            try {
              row.config = JSON.parse(row.config);
            } catch { /* not JSON */ }
          }
          resolve(row);
        }
      );
    });
  },

  listMcpTools: (enabledOnly = true) => {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM mcp_tools`;
      if (enabledOnly) {
        query += ` WHERE enabled = 1`;
      }
      query += ` ORDER BY name ASC`;
      db.all(query, [], (err, rows) => {
        if (err) return reject(err);
        // Parse JSON configs
        rows.forEach(row => {
          if (row.config) {
            try {
              row.config = JSON.parse(row.config);
            } catch { /* not JSON */ }
          }
        });
        resolve(rows);
      });
    });
  },

  updateMcpTool: (name, updates) => {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          if (key === 'config' && typeof value === 'object') {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      }
      if (fields.length === 0) return resolve(null);
      values.push(name);
      db.run(
        `UPDATE mcp_tools SET ${fields.join(', ')} WHERE name = ?`,
        values,
        function (err) {
          if (err) return reject(err);
          resolve({ name, ...updates });
        }
      );
    });
  },

  // Instructions
  getInstruction: (id) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM instructions WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  },

  listInstructions: (enabledOnly = false) => {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM instructions`;
      if (enabledOnly) {
        query += ` WHERE enabled = 1`;
      }
      query += ` ORDER BY priority ASC, created_at DESC`;
      db.all(query, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  createInstruction: (name, content, category, priority) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO instructions (name, content, category, priority) VALUES (?, ?, ?, ?)`,
        [name, content, category || 'general', priority || 50],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, name, content, category, priority });
        }
      );
    });
  },

  updateInstruction: (id, updates) => {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
      if (fields.length === 0) return resolve(null);
      values.push(id);
      db.run(
        `UPDATE instructions SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function (err) {
          if (err) return reject(err);
          resolve({ id, ...updates });
        }
      );
    });
  },

  deleteInstruction: (id) => {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM instructions WHERE id = ?`,
        [id],
        function (err) {
          if (err) return reject(err);
          resolve({ affected: this.changes });
        }
      );
    });
  },

  // Skills
  getSkill: (id) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM skills WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) return reject(err);
          if (row && row.config) {
            try { row.config = JSON.parse(row.config); } catch { /* not JSON */ }
          }
          resolve(row);
        }
      );
    });
  },

  getSkillByName: (name) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM skills WHERE name = ?`,
        [name],
        (err, row) => {
          if (err) return reject(err);
          if (row && row.config) {
            try { row.config = JSON.parse(row.config); } catch { /* not JSON */ }
          }
          resolve(row);
        }
      );
    });
  },

  listSkills: (enabledOnly = false, type) => {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM skills`;
      const params = [];
      if (enabledOnly) {
        query += ` WHERE enabled = 1`;
      }
      if (type) {
        query += `${enabledOnly ? ' AND ' : ' WHERE '} type = ?`;
        params.push(type);
      }
      query += ` ORDER BY created_at DESC`;
      db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        rows.forEach(row => {
          if (row.config) {
            try { row.config = JSON.parse(row.config); } catch { /* not JSON */ }
          }
        });
        resolve(rows);
      });
    });
  },

  createSkill: (name, description, type, code, config) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO skills (name, description, type, code, config) VALUES (?, ?, ?, ?, ?)`,
        [name, description || '', type || 'javascript', code || null, config ? JSON.stringify(config) : null],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, name, description, type, code });
        }
      );
    });
  },

  updateSkill: (id, updates) => {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          if (key === 'config' && typeof value === 'object') {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      }
      if (fields.length === 0) return resolve(null);
      values.push(id);
      db.run(
        `UPDATE skills SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function (err) {
          if (err) return reject(err);
          resolve({ id, ...updates });
        }
      );
    });
  },

  deleteSkill: (id) => {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM skills WHERE id = ?`,
        [id],
        function (err) {
          if (err) return reject(err);
          resolve({ affected: this.changes });
        }
      );
    });
  },

  // User Data
  getUserData: (category, key) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM user_data WHERE category = ? AND key = ?`,
        [category, key],
        (err, row) => {
          if (err) return reject(err);
          if (row) {
            try { row.value = JSON.parse(row.value); } catch { /* not JSON */ }
          }
          resolve(row);
        }
      );
    });
  },

  listUserData: (category) => {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM user_data`;
      const params = [];
      if (category) {
        query += ` WHERE category = ?`;
        params.push(category);
      }
      query += ` ORDER BY updated_at DESC`;
      db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        rows.forEach(row => {
          try { row.value = JSON.parse(row.value); } catch { /* not JSON */ }
        });
        resolve(rows);
      });
    });
  },

  createOrUpdateUserData: (category, key, value, confidence) => {
    return new Promise((resolve, reject) => {
      const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
      db.run(
        `INSERT OR REPLACE INTO user_data (category, key, value, confidence) VALUES (?, ?, ?, ?)`,
        [category, key, serialized, confidence !== undefined ? confidence : 1.0],
        function (err) {
          if (err) return reject(err);
          resolve({ category, key, value, confidence });
        }
      );
    });
  },

  deleteUserData: (category, key) => {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM user_data WHERE category = ? AND key = ?`,
        [category, key],
        function (err) {
          if (err) return reject(err);
          resolve({ affected: this.changes });
        }
      );
    });
  },

  // Skill Usage
  logSkillUsage: (skillId, conversationId, messageId, success, executionTimeMs) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO skill_usage (skill_id, conversation_id, message_id, success, execution_time_ms) VALUES (?, ?, ?, ?, ?)`,
        [skillId, conversationId || null, messageId || null, success !== undefined ? (success ? 1 : 0) : 1, executionTimeMs || null],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID });
        }
      );
    });
  },

  getSkillUsageStats: (skillId) => {
    return new Promise((resolve, reject) => {
      let query = `SELECT *, COUNT(*) as count FROM skill_usage`;
      const params = [];
      if (skillId) {
        query += ` WHERE skill_id = ?`;
        params.push(skillId);
      }
      query += ` GROUP BY skill_id ORDER BY created_at DESC`;
      db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
};
