#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '..', 'assets', 'data.db');

// Ensure assets directory exists
const assetsDir = path.dirname(dbPath);
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // First, add missing columns to tasks table if they don't exist
  const addColumns = [
    'project_id TEXT',
    'section_id TEXT',
    'status TEXT DEFAULT "todo"'
  ];

  // Check and add missing columns
  let columnCount = 0;
  const columnsToCheck = ['project_id', 'section_id', 'status'];

  const checkAndAddColumns = (index) => {
    if (index >= columnsToCheck.length) {
      createTables();
      return;
    }

    const col = columnsToCheck[index];
    db.run(`SELECT ${col} FROM tasks LIMIT 1`, [], (err) => {
      if (err) {
        // Column doesn't exist, add it
        db.run(`ALTER TABLE tasks ADD COLUMN ${col}`, (err) => {
          if (err) {
            console.error(`Error adding ${col}:`, err.message);
          } else {
            console.log(`Added ${col} column`);
          }
          checkAndAddColumns(index + 1);
        });
      } else {
        // Column exists
        console.log(`${col} column already exists`);
        checkAndAddColumns(index + 1);
      }
    });
  };

  checkAndAddColumns(0);
});

function createTables() {
  db.serialize(() => {
    // Create projects table
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        emoji TEXT,
        color TEXT,
        is_shared INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        order_index INTEGER DEFAULT 0
      )
    `);

    // Create sections table
    db.run(`
      CREATE TABLE IF NOT EXISTS sections (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);

    // Create templates table
    db.run(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        data TEXT,
        is_public INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);

    // Indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_section_id ON tasks(section_id)`);

    // Insert default labels if not exists
    const defaultLabels = [
      { name: 'work', color: 'hsl(217, 92%, 83%)' },
      { name: 'personal', color: 'hsl(145, 70%, 55%)' },
      { name: 'urgent', color: 'hsl(0, 75%, 55%)' },
      { name: 'shopping', color: 'hsl(30, 80%, 70%)' },
      { name: 'health', color: 'hsl(10, 70%, 60%)' },
    ];

    defaultLabels.forEach((label) => {
      db.run(
        'INSERT OR IGNORE INTO labels (name, color) VALUES (?, ?)',
        [label.name, label.color]
      );
    });

    // Insert default projects if not exists
    const defaultProjects = [
      { id: 'proj_1', name: 'Getting Started', emoji: '📝', color: '#5e7dff', order_index: 0 },
      { id: 'proj_2', name: 'Work', emoji: '👔', color: '#5e7dff', order_index: 1 },
      { id: 'proj_3', name: 'Personal', emoji: '🏡', color: '#e74c3c', order_index: 2 },
      { id: 'proj_4', name: 'Shopping', emoji: '🛒', color: '#f1c40f', order_index: 3 },
      { id: 'proj_5', name: 'Health', emoji: '❤️', color: '#e74c3c', order_index: 4 },
    ];

    const now = Date.now();
    defaultProjects.forEach((project) => {
      db.run(
        'INSERT OR IGNORE INTO projects (id, name, emoji, color, is_shared, created_at, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [project.id, project.name, project.emoji, project.color, 0, now, project.order_index]
      );
    });

    // Insert default sections
    const defaultSections = [
      { id: 'sec_1', project_id: 'proj_1', name: 'Todoist 101', order_index: 0 },
      { id: 'sec_2', project_id: 'proj_1', name: 'Try It', order_index: 1 },
      { id: 'sec_3', project_id: 'proj_2', name: 'Meetings', order_index: 0 },
      { id: 'sec_4', project_id: 'proj_2', name: 'Projects', order_index: 1 },
      { id: 'sec_5', project_id: 'proj_3', name: 'Errands', order_index: 0 },
      { id: 'sec_6', project_id: 'proj_3', name: 'Home', order_index: 1 },
    ];

    defaultSections.forEach((section) => {
      db.run(
        'INSERT OR IGNORE INTO sections (id, project_id, name, order_index) VALUES (?, ?, ?, ?)',
        [section.id, section.project_id, section.name, section.order_index]
      );
    });

    // Insert default templates
    const templates = [
      { id: 'tmpl_1', name: 'Weekly Review', category: 'Work', description: 'Weekly planning and review tasks', is_public: 1, created_at: now },
      { id: 'tmpl_2', name: 'Meal Planning', category: 'Personal', description: 'Plan meals for the week', is_public: 1, created_at: now },
      { id: 'tmpl_3', name: 'Project Tracker', category: 'Work', description: 'Track project progress', is_public: 1, created_at: now },
      { id: 'tmpl_4', name: 'Fitness Routine', category: 'Health', description: 'Weekly fitness schedule', is_public: 0, created_at: now },
    ];

    templates.forEach((tmpl) => {
      db.run(
        'INSERT OR IGNORE INTO templates (id, name, category, description, data, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tmpl.id, tmpl.name, tmpl.category, tmpl.description, '', tmpl.is_public, tmpl.created_at]
      );
    });

    console.log('Database initialized successfully!');
    console.log(`Database path: ${dbPath}`);

    // Verify tables
    const tables = ['tasks', 'labels', 'projects', 'sections', 'templates'];
    tables.forEach(table => {
      db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table], (err, row) => {
        if (row) {
          console.log(`  - ${table} table exists`);
        }
      });
    });

    db.close();
  });
}
