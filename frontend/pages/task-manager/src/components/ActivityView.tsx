import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  Search, 
  Users, 
  CheckCircle2, 
  Trophy,
  Hash,
  Inbox,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ActivityView = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('All projects');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const projects = [
    { id: 'all', name: 'All Projects', icon: Hash },
    { id: 'inbox', name: 'Inbox', icon: Inbox },
    { id: 'getting-started', name: 'Getting Started 👋', icon: Hash, isSub: true },
    { id: 'learn-devops', name: 'learn DevOps', icon: Hash, isSub: true },
  ];

  return (
    <div className="flex-1 flex flex-col bg-brand-surface overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-24 pb-4 flex items-center justify-between border-b border-white/5">
        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <h1 className="text-2xl font-bold text-brand-text">Activity: {selectedProject}</h1>
            <ChevronDown size={20} className={`text-brand-muted group-hover:text-brand-text transition-all ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 mt-2 w-64 bg-brand-card rounded-xl shadow-2xl border border-white/10 z-50 overflow-hidden"
              >
                <div className="p-2 border-b border-white/5">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                    <input 
                      type="text" 
                      placeholder="Type a project name" 
                      className="w-full pl-9 pr-3 py-1.5 bg-brand-bg border border-white/10 rounded-lg text-xs text-brand-text focus:outline-none focus:border-brand-accent transition-all"
                    />
                  </div>
                </div>

                <div className="p-1 max-h-80 overflow-y-auto">
                  <button 
                    onClick={() => { setSelectedProject('All projects'); setIsDropdownOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-brand-text hover:bg-white/5 rounded-lg transition-colors group"
                  >
                    <Hash size={16} className="text-brand-muted group-hover:text-brand-text" />
                    <span>All Projects</span>
                  </button>
                  <button 
                    onClick={() => { setSelectedProject('Inbox'); setIsDropdownOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-brand-text hover:bg-white/5 rounded-lg transition-colors group"
                  >
                    <Inbox size={16} className="text-brand-muted group-hover:text-brand-text" />
                    <span>Inbox</span>
                  </button>

                  <div className="px-3 py-2 mt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-brand-accent/20 flex items-center justify-center">
                        <LayoutGrid size={12} className="text-brand-accent" />
                      </div>
                      <span className="text-[10px] font-bold text-brand-text uppercase tracking-wider">My Projects</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => { setSelectedProject('Getting Started 👋'); setIsDropdownOpen(false); }}
                    className="w-full flex items-center gap-3 px-8 py-2 text-sm text-brand-text hover:bg-white/5 rounded-lg transition-colors group"
                  >
                    <Hash size={16} className="text-brand-muted group-hover:text-brand-text" />
                    <span>Getting Started 👋</span>
                  </button>
                  <button 
                    onClick={() => { setSelectedProject('learn DevOps'); setIsDropdownOpen(false); }}
                    className="w-full flex items-center gap-3 px-8 py-2 text-sm text-brand-text hover:bg-white/5 rounded-lg transition-colors group"
                  >
                    <Hash size={16} className="text-brand-muted group-hover:text-brand-text" />
                    <span>learn DevOps</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-3 py-1.5 text-brand-muted hover:bg-white/5 rounded-lg transition-colors">
            <Users size={18} className="text-brand-muted" />
            <span className="text-sm font-medium">Everyone</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-brand-muted hover:bg-white/5 rounded-lg transition-colors">
            <CheckCircle2 size={18} className="text-brand-muted" />
            <span className="text-sm font-medium">Completed tasks</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center max-w-md"
        >
          <div className="relative mb-8">
            <div className="w-48 h-48 bg-brand-card rounded-full flex items-center justify-center border border-white/5">
              <Trophy size={80} className="text-brand-accent opacity-50" />
            </div>
          </div>

          <h2 className="text-lg font-bold text-brand-text mb-2">No activity in the past week.</h2>
          <p className="text-brand-muted text-sm leading-relaxed mb-4">
            See all changes that have been made in <br />
            your account, by you or your <br />
            collaborators. <br />
            Free users can still view their completed <br />
            tasks inside any project.
          </p>
          
          <p className="text-brand-muted/50 text-xs italic mt-8">
            That's it. No more history to load.
          </p>
        </motion.div>
      </div>
    </div>
  );
};
