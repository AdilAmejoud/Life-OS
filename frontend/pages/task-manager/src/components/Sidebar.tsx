import React from 'react';
import { 
  Inbox, 
  Calendar, 
  Clock, 
  FolderOpen, 
  Archive,
  Settings,
  HelpCircle,
  Hash,
  Filter,
  Terminal,
  Plus,
  Search,
  CheckCircle2,
  Users,
  LayoutGrid,
  ChevronRight,
  Sidebar as SidebarIcon,
  Bell
} from 'lucide-react';
import { View } from '../types';
import { ProfileDropdown } from './ProfileDropdown';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onOpenCommandPalette: () => void;
  onOpenAddTaskModal: () => void;
  onOpenAddProjectModal: () => void;
  selectedProjectId: string | null;
}

const navItems = [
  { icon: Search, label: 'Search', id: 'search' as any, shortcut: 'Ctrl K' },
  { icon: Inbox, label: 'Inbox', id: 'inbox' as View, badge: 0 },
  { icon: Calendar, label: 'Today', id: 'today' as View, badge: 3 },
  { icon: Clock, label: 'Upcoming', id: 'upcoming' as View },
  { icon: Filter, label: 'Filters & Labels', id: 'filters' as any },
  { icon: CheckCircle2, label: 'Completed', id: 'completed' as any },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onViewChange, 
  onOpenCommandPalette, 
  onOpenAddTaskModal, 
  onOpenAddProjectModal,
  selectedProjectId
}) => {
  return (
    <aside id="sidebar" className="w-64 flex-shrink-0 bg-brand-bg flex flex-col justify-between h-screen sticky top-0 border-r border-white/5">
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="p-3 flex flex-col gap-4">
          {/* Top Section: Profile and Icons */}
          <div className="flex items-center justify-between px-1">
            <ProfileDropdown />
            <div className="flex items-center gap-1">
              <button className="p-1.5 text-brand-muted hover:text-brand-text hover:bg-white/5 rounded-lg transition-colors">
                <Bell size={18} />
              </button>
              <button className="p-1.5 text-brand-muted hover:text-brand-text hover:bg-white/5 rounded-lg transition-colors">
                <SidebarIcon size={18} />
              </button>
            </div>
          </div>

          {/* Add Task Button */}
          <button 
            onClick={onOpenAddTaskModal}
            className="flex items-center gap-2 px-3 py-2 text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-all group"
          >
            <div className="w-5 h-5 rounded-full bg-brand-accent flex items-center justify-center text-white">
              <Plus size={14} strokeWidth={3} />
            </div>
            <span className="text-sm font-bold">Add task</span>
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="w-4 h-4 rounded border border-brand-accent/20 flex items-center justify-center text-[8px] font-bold">Q</div>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'search') {
                    onOpenCommandPalette();
                  } else {
                    onViewChange(item.id);
                  }
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg transition-all duration-200 group ${
                  currentView === item.id 
                    ? 'bg-brand-accent text-brand-text font-semibold' 
                    : 'text-brand-muted hover:bg-white/5 hover:text-brand-text'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon 
                    size={20} 
                    className={currentView === item.id ? 'text-brand-text' : 'text-brand-muted group-hover:text-brand-text'} 
                  />
                  <span className="text-sm">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    currentView === item.id ? 'text-brand-text' : 'text-brand-muted'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* My Projects Section */}
          <div className="mt-4">
            <div className="flex items-center justify-between px-3 mb-2 group">
              <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">My Projects</span>
              <button 
                onClick={onOpenAddProjectModal}
                className="p-1 text-brand-muted hover:text-brand-text hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-all"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              <button 
                onClick={() => onViewChange('projects')}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg transition-all group ${
                  currentView === 'projects' && !selectedProjectId ? 'bg-white/5 text-brand-text' : 'text-brand-muted hover:bg-white/5 hover:text-brand-text'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Hash size={18} className="text-brand-muted group-hover:text-brand-text" />
                  <span className="text-sm">Getting Started 👋</span>
                </div>
                <span className="text-[10px] text-brand-muted font-medium">19</span>
              </button>

              <button 
                onClick={() => onViewChange('projects')}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg transition-all group bg-brand-accent/10 text-brand-accent font-semibold`}
              >
                <div className="flex items-center gap-3">
                  <Hash size={18} className="text-brand-accent" />
                  <span className="text-sm">learn DevOps</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-white/5 flex flex-col gap-0.5">
        <button className="flex items-center gap-3 px-3 py-2 text-brand-muted hover:bg-white/5 rounded-lg transition-all group">
          <Users size={18} className="text-brand-muted group-hover:text-brand-text" />
          <span className="text-sm font-medium">Team</span>
        </button>
        <button className="flex items-center gap-3 px-3 py-2 text-brand-muted hover:bg-white/5 rounded-lg transition-all group">
          <Calendar size={18} className="text-brand-muted group-hover:text-brand-text" />
          <span className="text-sm font-medium">Calendar</span>
        </button>
        <div className="mt-auto pt-4">
          <button className="flex items-center gap-3 px-3 py-2 text-brand-muted hover:bg-white/5 rounded-lg transition-all group w-full">
            <Settings size={18} className="text-brand-muted group-hover:text-brand-text" />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

