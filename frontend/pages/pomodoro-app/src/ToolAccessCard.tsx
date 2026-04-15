import React from 'react';
import {
  Terminal,
  Code,
  Bot,
  Github,
  FileCode,
  Container,
  GitBranch,
  TerminalSquare,
  Server,
} from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  url?: string;
  isLocal: boolean;
  icon: React.ReactNode;
}

const tools: Tool[] = [
  {
    id: 'vscode',
    name: 'VSCode',
    description: 'Visual Studio Code',
    url: 'https://vscode.dev',
    isLocal: false,
    icon: <Code size={30} />,
  },
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'Open Terminal',
    isLocal: true,
    icon: <Terminal size={30} />,
  },
  {
    id: 'neovim',
    name: 'Neovim',
    description: 'Neovim Editor',
    isLocal: true,
    icon: <Code size={30} />,
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Claude AI',
    url: 'https://claude.ai',
    isLocal: false,
    icon: <Bot size={30} />,
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Local LLM Server',
    isLocal: true,
    icon: <Bot size={30} />,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Code Hosting',
    url: 'https://github.com',
    isLocal: false,
    icon: <Github size={30} />,
  },
  {
    id: 'stackoverflow',
    name: 'StackOverflow',
    description: 'Developer Q&A',
    url: 'https://stackoverflow.com',
    isLocal: false,
    icon: <FileCode size={30} />,
  },
  {
    id: 'docker',
    name: 'Docker',
    description: 'Container Platform',
    isLocal: true,
    icon: <Container size={30} />,
  },
  {
    id: 'git',
    name: 'Git',
    description: 'Version Control',
    isLocal: true,
    icon: <GitBranch size={30} />,
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Python Interpreter',
    isLocal: true,
    icon: <TerminalSquare size={30} />,
  },
  {
    id: 'node',
    name: 'Node.js',
    description: 'JavaScript Runtime',
    isLocal: true,
    icon: <Server size={30} />,
  },
];

export const ToolAccessCard: React.FC = () => {
  const handleToolClick = async (tool: Tool) => {
    // 1. Handle Web Links
    if (!tool.isLocal && tool.url) {
      window.open(tool.url, '_blank');
      return;
    }

    // 2. Handle Local Tools via Bridge
    try {
      const response = await fetch('http://localhost:3001/open-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tool.id }),
      });

      if (!response.ok) throw new Error('Failed to launch');
    } catch (error) {
      console.error(error);
      alert(`Could not open ${tool.name}. Is the bridge server running?`);
    }
  };


  return (
    <div className="tool-access-card">
      <div className="tool-access-card-header">
        <h3 className="tool-access-card-title">Developer Tools</h3>
      </div>
      <div className="tool-grid">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="tool-item"
            onClick={() => handleToolClick(tool)}
            title={tool.description}
          >
            <div className="tool-item-icon">{tool.icon}</div>
            <div className="tool-item-content">
              <span className="tool-item-name">{tool.name}</span>
              <span className="tool-item-desc">{tool.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolAccessCard;
