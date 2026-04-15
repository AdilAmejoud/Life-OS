const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/pages/ai/src/components');

const replacements = [
  { file: 'SkillsDetailView.jsx', regex: /text-accent/g, replace: 'text-text-secondary' },
  { file: 'SkillsDetailView.jsx', regex: /hover:border-accent/g, replace: 'hover:border-border-bright' },
  { file: 'SkillsDetailView.jsx', regex: /focus:border-accent/g, replace: 'focus:border-transparent' },
  { file: 'TasksPanel.jsx', regex: /focus:border-accent\/50/g, replace: 'focus:border-transparent' },
  { file: 'TasksPanel.jsx', regex: /hover:text-accent/g, replace: 'hover:text-text-primary' },
  { file: 'TasksPanel.jsx', regex: /className="text-accent"/g, replace: 'className="text-text-secondary"' },
  { file: 'ConnectorsDetailView.jsx', regex: /hover:border-accent/g, replace: 'hover:border-border-bright' },
  { file: 'Toast.jsx', regex: /border-accent/g, replace: 'border-border-bright' },
  { file: 'WorkflowsPanel.jsx', regex: /hover:border-accent\/40/g, replace: 'hover:border-border-bright' },
  { file: 'CredentialManager.jsx', regex: /text-accent/g, replace: 'text-text-secondary' },
  { file: 'CredentialManager.jsx', regex: /hover:border-accent\/50/g, replace: 'hover:border-border-bright' },
  { file: 'CredentialManager.jsx', regex: /focus:border-accent/g, replace: 'focus:border-transparent' },
  { file: 'InputArea.jsx', regex: /text-accent/g, replace: 'text-text-primary' },
  { file: 'InputArea.jsx', regex: /group-hover:border-accent\/40/g, replace: 'group-hover:border-border-bright' },
  { file: 'SettingsPanel.jsx', regex: /bg-accent'/g, replace: 'bg-text-primary\'' }
];

for (const { file, regex, replace } of replacements) {
  const filePath = path.join(srcDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(regex, replace);
    fs.writeFileSync(filePath, content);
  }
}
console.log('Done replacements');
