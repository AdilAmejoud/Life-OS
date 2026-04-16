const fs = require('fs');

let content = fs.readFileSync('/home/adil/Life_OS_v2/docker-compose.yml', 'utf8');

// Replace generic secrets paths
content = content.replace(/secrets\/\.env/g, '.secrets/.env');

// Glance
content = content.replace('- ./frontend:/app/assets', '- ./config/assets:/app/assets');

// Notion Proxy
content = content.replace('- ./backend/notion-proxy:/app', '- ./apps/notion-proxy/backend:/app');

// AI Assistant
content = content.replace('- ./backend/ai-assistant:/app', '- ./apps/ai-assistant/backend:/app');
content = content.replace('- ./frontend/pages/ai:/app/frontend/pages/ai', '- ./apps/ai-assistant/frontend:/app/frontend');

// Delete Nexus service entirely (lines between "nexus:" and next service "pomodoro:")
content = content.replace(/  nexus:[\s\S]*?(?=  pomodoro:)/, '');

// Delete nexus_data volume
content = content.replace(/  nexus_data:\s*/, '');

// Pomodoro
content = content.replace('- ./backend/pomodoro/server.js:/app/server.js', '- ./apps/pomodoro/backend/server.js:/app/server.js');
content = content.replace('- ./frontend/pages/pomodoro-app/dist:/app/dist', '- ./apps/pomodoro/frontend/dist:/app/dist');

// Task API
content = content.replace('- ./backend/task-api:/app', '- ./apps/task-manager/backend:/app');
content = content.replace('- ./backend/shared:/app/assets', '- ./shared:/app/assets');
content = content.replace(/\s*- \.\/frontend\/pages\/task-app:\/app\/assets\/task-app\n/, '\x0A');

// Youtube Proxy
content = content.replace('- ./backend/youtube-proxy:/app', '- ./apps/youtube-proxy/backend:/app');

// Content API
content = content.replace('- ./backend/content-api:/app', '- ./apps/content-api/backend:/app');

// Super-Productivity
content = content.replace('- ./super-productivity/.tmp/angular-dist:/app/dist', '- ./external/super-productivity/.tmp/angular-dist:/app/dist');
content = content.replace('- ./backend/super-productivity/super-prod-server.js:/app/server.js', '- ./apps/super-productivity/backend/super-prod-server.js:/app/server.js');

fs.writeFileSync('/home/adil/Life_OS_v2/docker-compose.yml', content);
console.log("Updated docker-compose.yml successfully!");
