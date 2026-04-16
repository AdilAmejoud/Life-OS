import React from 'react';
import { Search, Plus, Hash, ChevronDown, Settings } from 'lucide-react';
import { Project } from '../types';

interface ProjectsViewProps {
  onSelectProject: (projectId: string) => void;
  onOpenAddProjectModal: () => void;
}

const projects: Project[] = [
  { id: 'getting-started', name: 'Getting Started', emoji: '👋' },
  { id: 'learn-devops', name: 'Learn DevOps', emoji: '🚀' },
];

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onSelectProject, onOpenAddProjectModal }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-brand-surface p-12 relative">
      <div className="max-w-4xl mx-auto">
        {/* Top Right Settings */}
        <div className="absolute top-4 right-8 z-10">
          <button className="flex items-center gap-2 px-3 py-1.5 text-brand-muted hover:bg-white/5 rounded-lg transition-colors group">
            <Settings size={18} className="text-brand-muted group-hover:text-brand-text" />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-text mb-1">My Projects</h1>
          <p className="text-brand-muted text-sm">Free</p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={18} />
              <input 
                type="text" 
                placeholder="Search projects" 
                className="w-full pl-10 pr-4 py-2 bg-brand-card border border-white/10 rounded-lg focus:outline-none transition-all text-sm text-brand-text placeholder-brand-muted"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-brand-muted">Archived projects only</span>
                <button className="w-10 h-5 bg-white/10 rounded-full relative transition-colors">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-brand-muted rounded-full shadow-sm"></div>
                </button>
              </div>

              <div className="flex items-center bg-brand-card border border-white/10 rounded-lg shadow-sm">
                <button 
                  onClick={onOpenAddProjectModal}
                  className="flex items-center gap-2 px-4 py-1.5 text-brand-text text-sm font-semibold hover:bg-white/5 rounded-l-lg transition-all"
                >
                  <Plus size={16} />
                  <span>Add</span>
                </button>
                <div className="w-px h-4 bg-white/10"></div>
                <button className="px-2 py-1.5 text-brand-text hover:bg-white/5 rounded-r-lg transition-all">
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-4">
              <span className="text-sm font-bold text-brand-text">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="flex flex-col gap-1">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-all group text-left"
                >
                  <Hash size={18} className="text-brand-muted group-hover:text-brand-accent transition-colors" />
                  <span className="text-sm font-semibold text-brand-muted group-hover:text-brand-text">
                    {project.name} {project.emoji}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
