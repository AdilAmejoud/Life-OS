#!/usr/bin/env node

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.TASK_API_PORT || 3100;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for all origins (for development)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Database setup - look in both locations for development/production flexibility
const dbPaths = [
  path.join(__dirname, 'assets', 'data.db'),
  path.join(__dirname, '..', 'assets', 'data.db'),
  '/app/assets/data.db',
];
let dbPath = dbPaths.find(p => fs.existsSync(p)) || dbPaths[0];
console.log(`Using database at: ${dbPath}`);
const db = new sqlite3.Database(dbPath);

// Ensure tables exist
db.serialize(() => {
  // Tasks table - extended
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      due_date INTEGER,
      priority INTEGER DEFAULT 3,
      labels TEXT,
      completed INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      subtasks TEXT,
      recurring_rule TEXT,
      updated_at INTEGER NOT NULL,
      project_id TEXT,
      section_id TEXT,
      status TEXT DEFAULT 'todo'
    )
  `);

  // Labels table
  db.run(`
    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT
    )
  `);

  // Projects table
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

  // Sections table
  db.run(`
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // Templates table
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
});

// Utility functions
const parseJson = (str, defaultValue = []) => {
  try {
    return str ? JSON.parse(str) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const formatDate = (date) => date.toISOString();

// API Routes

// GET /api/health - Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// GET /api/tasks - Get all tasks with optional filter
app.get('/api/tasks', (req, res) => {
  const { filter, search, project_id, section_id } = req.query;
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let baseQuery = 'SELECT * FROM tasks';
  let countQuery = 'SELECT COUNT(*) as total FROM tasks';
  const params = [];
  const whereClauses = [];

  if (filter) {
    switch (filter) {
      case 'inbox':
        whereClauses.push('(completed = 0 OR completed IS NULL)');
        break;
      case 'today':
        whereClauses.push('completed = 0');
        whereClauses.push('due_date >= ?');
        whereClauses.push('due_date <= ?');
        params.push(todayStart.getTime(), todayEnd.getTime());
        break;
      case 'upcoming':
        whereClauses.push('completed = 0');
        whereClauses.push('due_date > ?');
        params.push(todayEnd.getTime());
        break;
      case 'completed':
        whereClauses.push('completed = 1');
        break;
      case 'overdue':
        whereClauses.push('completed = 0');
        whereClauses.push('due_date < ?');
        params.push(now);
        break;
      case 'p1':
        whereClauses.push('completed = 0');
        whereClauses.push('priority = 1');
        break;
      case 'p2':
        whereClauses.push('completed = 0');
        whereClauses.push('priority = 2');
        break;
      case 'p3':
        whereClauses.push('completed = 0');
        whereClauses.push('priority = 3');
        break;
      case 'p4':
        whereClauses.push('completed = 0');
        whereClauses.push('priority = 4');
        break;
    }
  }

  if (search) {
    whereClauses.push('(title LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (project_id) {
    whereClauses.push('project_id = ?');
    params.push(project_id);
  }

  if (section_id) {
    whereClauses.push('section_id = ?');
    params.push(section_id);
  }

  if (whereClauses.length > 0) {
    const whereClause = ' WHERE ' + whereClauses.join(' AND ');
    baseQuery += whereClause;
    countQuery += whereClause;
  }

  baseQuery += ' ORDER BY completed ASC, due_date ASC, priority ASC';

  db.get(countQuery, params, (err, countRow) => {
    if (err) {
      console.error('Error counting tasks:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    db.all(baseQuery, params, (err, rows) => {
      if (err) {
        console.error('Error fetching tasks:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const tasks = rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description || null,
        due_date: row.due_date,
        priority: row.priority,
        labels: parseJson(row.labels, []),
        completed: row.completed === 1,
        created_at: row.created_at,
        subtasks: parseJson(row.subtasks, []),
        recurring_rule: row.recurring_rule || null,
        updated_at: row.updated_at,
        project_id: row.project_id,
        section_id: row.section_id,
        status: row.status || 'todo',
      }));

      res.json({ tasks, total: countRow.total });
    });
  });
});

// GET /api/tasks/:id - Get single task
app.get('/api/tasks/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error fetching task:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = {
      id: row.id,
      title: row.title,
      description: row.description || null,
      due_date: row.due_date,
      priority: row.priority,
      labels: parseJson(row.labels, []),
      completed: row.completed === 1,
      created_at: row.created_at,
      subtasks: parseJson(row.subtasks, []),
      recurring_rule: row.recurring_rule || null,
      updated_at: row.updated_at,
      project_id: row.project_id,
      section_id: row.section_id,
      status: row.status || 'todo',
    };

    res.json(task);
  });
});

// POST /api/tasks - Create new task
app.post('/api/tasks', (req, res) => {
  const {
    title,
    description,
    due_date,
    priority = 3,
    labels = [],
    subtasks = [],
    recurring_rule = null,
    project_id = null,
    section_id = null,
    status = 'todo',
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const now = Date.now();
  const id = uuidv4();

  db.run(
    `INSERT INTO tasks
      (id, title, description, due_date, priority, labels, completed, created_at, subtasks, recurring_rule, updated_at, project_id, section_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title,
      description || null,
      due_date || null,
      priority,
      JSON.stringify(labels),
      0,
      now,
      JSON.stringify(subtasks),
      recurring_rule || null,
      now,
      project_id,
      section_id,
      status,
    ],
    function (err) {
      if (err) {
        console.error('Error creating task:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const task = {
          id: row.id,
          title: row.title,
          description: row.description || null,
          due_date: row.due_date,
          priority: row.priority,
          labels: parseJson(row.labels, []),
          completed: row.completed === 1,
          created_at: row.created_at,
          subtasks: parseJson(row.subtasks, []),
          recurring_rule: row.recurring_rule || null,
          updated_at: row.updated_at,
          project_id: row.project_id,
          section_id: row.section_id,
          status: row.status || 'todo',
        };

        res.status(201).json(task);
      });
    }
  );
});

// PUT /api/tasks/:id - Update task
app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    due_date,
    priority,
    labels,
    completed,
    subtasks,
    recurring_rule,
    project_id,
    section_id,
    status,
  } = req.body;

  const updateFields = [];
  const params = [];

  if (title !== undefined) {
    updateFields.push('title = ?');
    params.push(title);
  }
  if (description !== undefined) {
    updateFields.push('description = ?');
    params.push(description);
  }
  if (due_date !== undefined) {
    updateFields.push('due_date = ?');
    params.push(due_date);
  }
  if (priority !== undefined) {
    updateFields.push('priority = ?');
    params.push(priority);
  }
  if (labels !== undefined) {
    updateFields.push('labels = ?');
    params.push(JSON.stringify(labels));
  }
  if (completed !== undefined) {
    updateFields.push('completed = ?');
    params.push(completed ? 1 : 0);
  }
  if (subtasks !== undefined) {
    updateFields.push('subtasks = ?');
    params.push(JSON.stringify(subtasks));
  }
  if (recurring_rule !== undefined) {
    updateFields.push('recurring_rule = ?');
    params.push(recurring_rule);
  }
  if (project_id !== undefined) {
    updateFields.push('project_id = ?');
    params.push(project_id);
  }
  if (section_id !== undefined) {
    updateFields.push('section_id = ?');
    params.push(section_id);
  }
  if (status !== undefined) {
    updateFields.push('status = ?');
    params.push(status);
  }

  updateFields.push('updated_at = ?');
  params.push(Date.now());
  params.push(id);

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const query = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;

  db.run(query, params, function (err) {
    if (err) {
      console.error('Error updating task:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const task = {
        id: row.id,
        title: row.title,
        description: row.description || null,
        due_date: row.due_date,
        priority: row.priority,
        labels: parseJson(row.labels, []),
        completed: row.completed === 1,
        created_at: row.created_at,
        subtasks: parseJson(row.subtasks, []),
        recurring_rule: row.recurring_rule || null,
        updated_at: row.updated_at,
        project_id: row.project_id,
        section_id: row.section_id,
        status: row.status || 'todo',
      };

      res.json(task);
    });
  });
});

// PATCH /api/tasks/:id/completed - Toggle completion status
app.patch('/api/tasks/:id/completed', (req, res) => {
  const { id } = req.params;

  db.get('SELECT completed FROM tasks WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error fetching task:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const newCompleted = row.completed === 0 ? 1 : 0;

    db.run(
      'UPDATE tasks SET completed = ?, updated_at = ? WHERE id = ?',
      [newCompleted, Date.now(), id],
      function (err) {
        if (err) {
          console.error('Error updating task completion:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          const task = {
            id: row.id,
            title: row.title,
            description: row.description || null,
            due_date: row.due_date,
            priority: row.priority,
            labels: parseJson(row.labels, []),
            completed: row.completed === 1,
            created_at: row.created_at,
            subtasks: parseJson(row.subtasks, []),
            recurring_rule: row.recurring_rule || null,
            updated_at: row.updated_at,
            project_id: row.project_id,
            section_id: row.section_id,
            status: row.status || 'todo',
          };

          res.json(task);
        });
      }
    );
  });
});

// DELETE /api/tasks/:id - Delete task
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM tasks WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Error deleting task:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted', id });
  });
});

// GET /api/labels - Get all labels
app.get('/api/labels', (req, res) => {
  db.all('SELECT * FROM labels ORDER BY name ASC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching labels:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(rows);
  });
});

// POST /api/labels - Create new label
app.post('/api/labels', (req, res) => {
  const { name, color } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  db.run(
    'INSERT OR IGNORE INTO labels (name, color) VALUES (?, ?)',
    [name, color],
    function (err) {
      if (err) {
        console.error('Error creating label:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        db.get('SELECT * FROM labels WHERE name = ?', [name], (err, row) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.status(200).json(row);
        });
      } else {
        db.get('SELECT * FROM labels WHERE name = ?', [name], (err, row) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.status(201).json(row);
        });
      }
    }
  );
});

// DELETE /api/labels/:name - Delete label
app.delete('/api/labels/:name', (req, res) => {
  const { name } = req.params;

  db.run('DELETE FROM labels WHERE name = ?', [name], function (err) {
    if (err) {
      console.error('Error deleting label:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Label not found' });
    }

    res.json({ message: 'Label deleted', name });
  });
});

// PROJECTS API

// GET /api/projects - Get all projects
app.get('/api/projects', (req, res) => {
  db.all('SELECT * FROM projects ORDER BY order_index ASC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching projects:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(rows);
  });
});

// POST /api/projects - Create new project
app.post('/api/projects', (req, res) => {
  const { name, emoji, color, order_index } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const now = Date.now();
  const id = uuidv4();

  db.run(
    'INSERT INTO projects (id, name, emoji, color, is_shared, created_at, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, emoji || '📁', color || '#5e7dff', 0, now, order_index || 0],
    function (err) {
      if (err) {
        console.error('Error creating project:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      db.get('SELECT * FROM projects WHERE id = ?', [id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json(row);
      });
    }
  );
});

// PUT /api/projects/:id - Update project
app.put('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const { name, emoji, color, order_index } = req.body;

  const updateFields = [];
  const params = [];

  if (name !== undefined) {
    updateFields.push('name = ?');
    params.push(name);
  }
  if (emoji !== undefined) {
    updateFields.push('emoji = ?');
    params.push(emoji);
  }
  if (color !== undefined) {
    updateFields.push('color = ?');
    params.push(color);
  }
  if (order_index !== undefined) {
    updateFields.push('order_index = ?');
    params.push(order_index);
  }

  updateFields.push('updated_at = ?');
  params.push(Date.now());
  params.push(id);

  const query = `UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?`;

  db.run(query, params, function (err) {
    if (err) {
      console.error('Error updating project:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    db.get('SELECT * FROM projects WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(row);
    });
  });
});

// DELETE /api/projects/:id - Delete project
app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM projects WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Error deleting project:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted', id });
  });
});

// SECTIONS API

// GET /api/sections - Get all sections
app.get('/api/sections', (req, res) => {
  const { project_id } = req.query;

  let query = 'SELECT * FROM sections';
  const params = [];

  if (project_id) {
    query += ' WHERE project_id = ?';
    params.push(project_id);
  }

  query += ' ORDER BY order_index ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching sections:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(rows);
  });
});

// GET /api/sections/:id - Get single section
app.get('/api/sections/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM sections WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error fetching section:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json(row);
  });
});

// POST /api/sections - Create new section
app.post('/api/sections', (req, res) => {
  const { project_id, name, order_index } = req.body;

  if (!project_id || !name) {
    return res.status(400).json({ error: 'Project ID and name are required' });
  }

  const id = uuidv4();

  db.run(
    'INSERT INTO sections (id, project_id, name, order_index) VALUES (?, ?, ?, ?)',
    [id, project_id, name, order_index || 0],
    function (err) {
      if (err) {
        console.error('Error creating section:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      db.get('SELECT * FROM sections WHERE id = ?', [id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json(row);
      });
    }
  );
});

// PUT /api/sections/:id - Update section
app.put('/api/sections/:id', (req, res) => {
  const { id } = req.params;
  const { name, order_index } = req.body;

  const updateFields = [];
  const params = [];

  if (name !== undefined) {
    updateFields.push('name = ?');
    params.push(name);
  }
  if (order_index !== undefined) {
    updateFields.push('order_index = ?');
    params.push(order_index);
  }

  updateFields.push('updated_at = ?');
  params.push(Date.now());
  params.push(id);

  const query = `UPDATE sections SET ${updateFields.join(', ')} WHERE id = ?`;

  db.run(query, params, function (err) {
    if (err) {
      console.error('Error updating section:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    db.get('SELECT * FROM sections WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(row);
    });
  });
});

// DELETE /api/sections/:id - Delete section
app.delete('/api/sections/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM sections WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Error deleting section:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json({ message: 'Section deleted', id });
  });
});

// TEMPLATES API

// GET /api/templates - Get all templates
app.get('/api/templates', (req, res) => {
  db.all('SELECT * FROM templates ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching templates:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(rows);
  });
});

// GET /api/templates/:id - Get single template
app.get('/api/templates/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM templates WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error fetching template:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(row);
  });
});

// POST /api/templates - Create new template
app.post('/api/templates', (req, res) => {
  const { name, category, description, data, is_public } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const now = Date.now();
  const id = uuidv4();

  db.run(
    'INSERT INTO templates (id, name, category, description, data, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, category || 'Personal', description || '', data || '', is_public || 0, now],
    function (err) {
      if (err) {
        console.error('Error creating template:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      db.get('SELECT * FROM templates WHERE id = ?', [id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json(row);
      });
    }
  );
});

// PUT /api/templates/:id - Update template
app.put('/api/templates/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, description, data, is_public } = req.body;

  const updateFields = [];
  const params = [];

  if (name !== undefined) {
    updateFields.push('name = ?');
    params.push(name);
  }
  if (category !== undefined) {
    updateFields.push('category = ?');
    params.push(category);
  }
  if (description !== undefined) {
    updateFields.push('description = ?');
    params.push(description);
  }
  if (data !== undefined) {
    updateFields.push('data = ?');
    params.push(JSON.stringify(data));
  }
  if (is_public !== undefined) {
    updateFields.push('is_public = ?');
    params.push(is_public ? 1 : 0);
  }

  updateFields.push('updated_at = ?');
  params.push(Date.now());
  params.push(id);

  const query = `UPDATE templates SET ${updateFields.join(', ')} WHERE id = ?`;

  db.run(query, params, function (err) {
    if (err) {
      console.error('Error updating template:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    db.get('SELECT * FROM templates WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(row);
    });
  });
});

// DELETE /api/templates/:id - Delete template
app.delete('/api/templates/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM templates WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Error deleting template:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted', id });
  });
});

// GET /api/tasks/stats - Get task statistics
app.get('/api/tasks/stats', (req, res) => {
  const queries = [
    { name: 'total', query: 'SELECT COUNT(*) as count FROM tasks' },
    { name: 'pending', query: 'SELECT COUNT(*) as count FROM tasks WHERE completed = 0' },
    { name: 'completed', query: 'SELECT COUNT(*) as count FROM tasks WHERE completed = 1' },
    { name: 'overdue', query: 'SELECT COUNT(*) as count FROM tasks WHERE completed = 0 AND due_date < ?' },
    { name: 'p1', query: 'SELECT COUNT(*) as count FROM tasks WHERE completed = 0 AND priority = 1' },
    { name: 'p2', query: 'SELECT COUNT(*) as count FROM tasks WHERE completed = 0 AND priority = 2' },
  ];

  const now = Date.now();
  const results = {};

  let completed = 0;
  queries.forEach((q, index) => {
    db.get(q.query.replace('?', now), [], (err, row) => {
      if (!err && row) {
        results[q.name] = row.count;
      }
      completed++;
      if (completed === queries.length) {
        res.json(results);
      }
    });
  });

  if (queries.length === 0) {
    res.json(results);
  }
});

// Serve static files from assets/task-app
app.use('/task-app', express.static(path.join(__dirname, 'assets', 'task-app')));

// Default route - serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets', 'task-app', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Task API server running on port ${PORT}`);
  console.log(`Database path: ${dbPath}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  db.close(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});
