import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { KanbanBoard } from './components/KanbanBoard';
import { InboxView } from './components/InboxView';
import { TodayView } from './components/TodayView';
import { UpcomingView } from './components/UpcomingView';
import { ProjectsView } from './components/ProjectsView';
import { ActivityView } from './components/ActivityView';
import { CommandPalette } from './components/CommandPalette';
import { AddTaskModal } from './components/AddTaskModal';
import { AddProjectModal } from './components/AddProjectModal';
import { View } from './types';
import { Plus, Share2, Kanban, LayoutPanelLeft, FileText } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('inbox');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    if (view === 'projects') {
      setSelectedProjectId(null);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'inbox':
        return <InboxView onAddTask={() => setIsAddTaskModalOpen(true)} />;
      case 'today':
        return <TodayView />;
      case 'upcoming':
        return <UpcomingView />;
      case 'completed' as any:
        return <ActivityView />;
      case 'projects':
        if (selectedProjectId === 'learn-devops') {
          return (
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-brand-surface">
              {/* Project Toolbar */}
              <div className="px-8 pt-8 pb-2 flex-shrink-0">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-extrabold text-brand-text tracking-tight">Learn DevOps</h1>
                    <p className="text-brand-muted text-sm mt-1.5 font-medium">
                      Mastering CI/CD, Docker, and Kubernetes Infrastructure
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white text-sm font-bold rounded-xl shadow-lg shadow-brand-accent/20 hover:bg-brand-accent/90 hover:-translate-y-0.5 transition-all active:translate-y-0">
                      <Plus size={18} />
                      <span>Add Task</span>
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-brand-card border border-white/10 text-brand-text text-sm font-bold rounded-xl hover:bg-white/5 hover:border-white/20 transition-all">
                      <Share2 size={18} />
                      <span>Share</span>
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-8 border-b border-white/5 mt-8">
                  <button className="px-1 pb-4 text-sm font-bold border-b-2 border-brand-accent text-brand-accent flex items-center gap-2 transition-all">
                    <Kanban size={16} /> Kanban
                  </button>
                  <button className="px-1 pb-4 text-sm font-semibold border-b-2 border-transparent text-brand-muted hover:text-brand-text transition-all flex items-center gap-2">
                    <LayoutPanelLeft size={16} /> Timeline
                  </button>
                  <button className="px-1 pb-4 text-sm font-semibold border-b-2 border-transparent text-brand-muted hover:text-brand-text transition-all flex items-center gap-2">
                    <FileText size={16} /> Files
                  </button>
                </div>
              </div>

              {/* Kanban Board Container */}
              <KanbanBoard />
            </div>
          );
        }
        return <ProjectsView 
          onSelectProject={(id) => {
            setSelectedProjectId(id);
            setCurrentView('kanban');
          }} 
          onOpenAddProjectModal={() => setIsAddProjectModalOpen(true)}
        />;
      default:
        return <div className="flex-1 flex items-center justify-center text-slate-400">View under construction</div>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg">
      <Sidebar 
        currentView={currentView} 
        onViewChange={handleViewChange} 
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenAddTaskModal={() => setIsAddTaskModalOpen(true)}
        onOpenAddProjectModal={() => setIsAddProjectModalOpen(true)}
        selectedProjectId={selectedProjectId}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-brand-surface">
        {/* renderView() */}
        {renderView()}
      </div>

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        onNavigate={handleViewChange}
      />

      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
      />

      <AddProjectModal 
        isOpen={isAddProjectModalOpen}
        onClose={() => setIsAddProjectModalOpen(false)}
      />
    </div>
  );
}
