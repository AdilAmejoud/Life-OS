import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Calendar,
  Clock,
  Inbox,
  Hash,
  CheckCircle2,
  Home,
  Filter,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: any) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [search, setSearch] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-brand-bg/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="command-palette"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full max-w-2xl bg-brand-card rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
          >
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
              <Search size={20} className="text-brand-muted" />
              <input
                autoFocus
                type="text"
                placeholder="Search or type a command..."
                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-lg placeholder:text-brand-muted text-brand-text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md text-[10px] font-mono text-brand-muted border border-white/10">
                <span>Ctrl</span>
                <span>K</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              <div className="px-3 py-2 text-[10px] font-bold text-brand-muted uppercase tracking-wider">Recently viewed</div>
              <div className="flex flex-col gap-0.5">
                <button className="flex items-center gap-3 px-3 py-2.5 text-brand-muted hover:bg-white/5 rounded-xl transition-colors group">
                  <Calendar size={18} className="text-brand-muted group-hover:text-brand-accent" />
                  <span className="text-sm font-medium">Today</span>
                </button>
                <button className="flex items-center gap-3 px-3 py-2.5 text-brand-muted hover:bg-white/5 rounded-xl transition-colors group">
                  <Clock size={18} className="text-brand-muted group-hover:text-brand-accent" />
                  <span className="text-sm font-medium">Upcoming</span>
                </button>
                <button className="flex items-center gap-3 px-3 py-2.5 text-brand-muted hover:bg-white/5 rounded-xl transition-colors group">
                  <Inbox size={18} className="text-brand-muted group-hover:text-brand-accent" />
                  <span className="text-sm font-medium">Inbox</span>
                </button>
              </div>

              <div className="px-3 py-2 mt-4 text-[10px] font-bold text-brand-muted uppercase tracking-wider border-t border-white/5 pt-4">Navigation</div>
              <div className="flex flex-col gap-0.5">
                <button className="flex items-center gap-3 px-3 py-2.5 text-brand-muted hover:bg-white/5 rounded-xl transition-colors group">
                  <Home size={18} className="text-brand-muted group-hover:text-brand-accent" />
                  <span className="text-sm font-medium">Go to home</span>
                  <div className="ml-auto flex items-center gap-1 text-[10px] font-mono text-brand-muted">
                    <span>G</span>
                    <span className="text-[8px] opacity-50">then</span>
                    <span>H</span>
                  </div>
                </button>
                <button className="flex items-center gap-3 px-3 py-2.5 text-brand-muted hover:bg-white/5 rounded-xl transition-colors group">
                  <Inbox size={18} className="text-brand-muted group-hover:text-brand-accent" />
                  <span className="text-sm font-medium">Go to Inbox</span>
                  <div className="ml-auto flex items-center gap-1 text-[10px] font-mono text-brand-muted">
                    <span>G</span>
                    <span className="text-[8px] opacity-50">then</span>
                    <span>I</span>
                  </div>
                </button>
                <button className="flex items-center gap-3 px-3 py-2.5 text-brand-muted hover:bg-white/5 rounded-xl transition-colors group">
                  <Calendar size={18} className="text-brand-muted group-hover:text-brand-accent" />
                  <span className="text-sm font-medium">Go to Today</span>
                  <div className="ml-auto flex items-center gap-1 text-[10px] font-mono text-brand-muted">
                    <span>G</span>
                    <span className="text-[8px] opacity-50">then</span>
                    <span>T</span>
                  </div>
                </button>
                <button className="flex items-center gap-3 px-3 py-2.5 text-brand-muted hover:bg-white/5 rounded-xl transition-colors group">
                  <Clock size={18} className="text-brand-muted group-hover:text-brand-accent" />
                  <span className="text-sm font-medium">Go to Upcoming</span>
                  <div className="ml-auto flex items-center gap-1 text-[10px] font-mono text-brand-muted">
                    <span>G</span>
                    <span className="text-[8px] opacity-50">then</span>
                    <span>U</span>
                  </div>
                </button>
                <button className="flex items-center gap-3 px-3 py-2.5 text-brand-muted hover:bg-white/5 rounded-xl transition-colors group">
                  <Filter size={18} className="text-brand-muted group-hover:text-brand-accent" />
                  <span className="text-sm font-medium">Go to Filters & Labels</span>
                  <div className="ml-auto flex items-center gap-1 text-[10px] font-mono text-brand-muted">
                    <span>G</span>
                    <span className="text-[8px] opacity-50">then</span>
                    <span>V</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="p-3 bg-brand-bg border-t border-white/5 flex items-center justify-between text-[10px] text-brand-muted">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="px-1 py-0.5 bg-brand-card border border-white/10 rounded shadow-sm">Enter</span>
                  <span>to select</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1 py-0.5 bg-brand-card border border-white/10 rounded shadow-sm">↑↓</span>
                  <span>to navigate</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1 py-0.5 bg-brand-card border border-white/10 rounded shadow-sm">Esc</span>
                <span>to close</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
