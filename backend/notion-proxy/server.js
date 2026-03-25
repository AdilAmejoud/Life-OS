const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT      = 3456;
const DATA_FILE = path.join(__dirname, "data.json");

function loadData() {
  const raw    = fs.readFileSync(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const phases = parsed.phases || [];

  const avg = phases.length
    ? Math.round(phases.reduce((s, p) => s + p.progress, 0) / phases.length)
    : 0;

  const active = phases.find((p) => p.status === "In Progress")
    ?? phases[0]
    ?? { name: "—", phase: "—", progress: 0, status: "—" };

  return {
    overall_progress: avg,
    active_name:      active.name,
    active_phase:     active.phase,
    active_progress:  active.progress,
    active_status:    active.status,
    phases:           phases.map((p) => ({ name: p.name, progress: p.progress })),
  };
}

function loadCoursesData() {
  const raw    = fs.readFileSync(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const courses = parsed.courses || [];

  // Current course: status="In Progress" or lowest progress > 0
  const inProgress = courses.filter((c) => c.status === "In Progress");
  const current = inProgress.length
    ? inProgress.reduce((prev, curr) => (prev.progress >= curr.progress ? prev : curr))
    : null;

  // If no "In Progress", find the one with lowest progress > 0
  if (!current) {
    const started = courses.filter((c) => c.progress > 0);
    if (started.length) {
      current = started.reduce((prev, curr) => (prev.progress <= curr.progress ? prev : curr));
    }
  }

  // Next course: status="Upcoming" or no progress yet, pick first by date
  const upcoming = courses.filter((c) => c.status === "Upcoming" || c.progress === 0);
  let next = null;
  if (upcoming.length) {
    next = upcoming[0]; // First upcoming
  }

  return {
    current_course: current ? {
      name: current.name,
      provider: current.provider || "—",
      status: current.status,
      progress: current.progress,
      end_date: current.end_date || "—",
    } : null,
    next_course: next ? {
      name: next.name,
      provider: next.provider || "—",
      status: next.status,
      progress: next.progress,
      end_date: next.end_date || "—",
    } : null,
    courses: courses.map((c) => ({
      name: c.name,
      provider: c.provider || "—",
      status: c.status,
      progress: c.progress,
      end_date: c.end_date || "—",
    })),
  };
}

function loadProjectsData() {
  const raw    = fs.readFileSync(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const projects = parsed.projects || [];

  // Current project: status="In Progress"
  const inProgress = projects.filter((p) => p.status === "In Progress");
  const current = inProgress.length
    ? inProgress[0]
    : null;

  // If no "In Progress", find the one with lowest progress > 0
  if (!current) {
    const started = projects.filter((p) => p.progress > 0);
    if (started.length) {
      current = started.reduce((prev, curr) => (prev.progress <= curr.progress ? prev : curr));
    }
  }

  // Next project: status="Upcoming" or no progress yet
  const upcoming = projects.filter((p) => p.status === "Upcoming" || p.progress === 0);
  let next = null;
  if (upcoming.length) {
    next = upcoming[0];
  }

  return {
    current_project: current ? {
      name: current.name,
      type: current.type || "—",
      status: current.status,
      progress: current.progress,
      end_date: current.end_date || "—",
    } : null,
    next_project: next ? {
      name: next.name,
      type: next.type || "—",
      status: next.status,
      progress: next.progress,
      end_date: next.end_date || "—",
    } : null,
    projects: projects.map((p) => ({
      name: p.name,
      type: p.type || "—",
      status: p.status,
      progress: p.progress,
      end_date: p.end_date || "—",
    })),
  };
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/learning" && req.method === "GET") {
    try {
      res.writeHead(200);
      res.end(JSON.stringify(loadData()));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  } else if (req.url === "/courses" && req.method === "GET") {
    try {
      res.writeHead(200);
      res.end(JSON.stringify(loadCoursesData()));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  } else if (req.url === "/projects" && req.method === "GET") {
    try {
      res.writeHead(200);
      res.end(JSON.stringify(loadProjectsData()));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}`);
  console.log(`Edit ~/Life_OS/notion-proxy/data.json to update your progress`);
});