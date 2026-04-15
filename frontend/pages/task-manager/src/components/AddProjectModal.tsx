import React from 'react';
import { 
  X, 
  HelpCircle, 
  ChevronDown, 
  Lock, 
  List, 
  LayoutGrid, 
  Calendar as CalendarIcon,
  Circle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-brand-card rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-brand-card">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-brand-text">Add project</h2>
                <HelpCircle size={16} className="text-brand-muted cursor-help" />
              </div>
              <button onClick={onClose} className="p-1 text-brand-muted hover:text-brand-text rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
              {/* Name */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-brand-text">Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-brand-bg border border-white/10 rounded-lg text-sm text-brand-text focus:outline-none focus:border-brand-accent transition-all"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-brand-muted font-medium">0/120</span>
                </div>
              </div>

              {/* Color */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-brand-text">Color</label>
                <button className="w-full flex items-center justify-between px-3 py-2 bg-brand-bg border border-white/10 rounded-lg text-sm text-brand-text hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <Circle size={12} className="fill-brand-muted text-brand-muted" />
                    <span>Charcoal</span>
                  </div>
                  <ChevronDown size={16} className="text-brand-muted" />
                </button>
              </div>

              {/* Workspace */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-brand-text">Workspace</label>
                <button className="w-full flex items-center justify-between px-3 py-2 bg-brand-bg border border-white/10 rounded-lg text-sm text-brand-text hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-brand-accent/20 flex items-center justify-center">
                      <LayoutGrid size={12} className="text-brand-accent" />
                    </div>
                    <span>My Projects</span>
                  </div>
                  <ChevronDown size={16} className="text-brand-muted" />
                </button>
              </div>

              {/* Parent Project */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-brand-text">Parent project</label>
                <button className="w-full flex items-center justify-between px-3 py-2 bg-brand-bg border border-white/10 rounded-lg text-sm text-brand-text hover:bg-white/5 transition-colors">
                  <span>No Parent</span>
                  <ChevronDown size={16} className="text-brand-muted" />
                </button>
              </div>

              {/* Access */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-brand-text">Access</label>
                <button className="w-full flex items-center justify-between px-3 py-2 bg-brand-bg border border-white/10 rounded-lg text-sm text-brand-text hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-brand-muted" />
                    <span>Restricted</span>
                  </div>
                  <ChevronDown size={16} className="text-brand-muted" />
                </button>
              </div>

              {/* Favorites Toggle */}
              <div className="flex items-center gap-3">
                <button className="w-10 h-5 bg-white/10 rounded-full relative transition-colors">
                  <div className="absolute left-1 top-1 w-3 h-3 bg-brand-muted rounded-full shadow-sm"></div>
                </button>
                <span className="text-sm font-medium text-brand-text">Add to favorites</span>
              </div>

              {/* Layout */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-brand-text">Layout</label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-brand-bg border border-white/10 rounded-xl">
                  <button className="flex flex-col items-center gap-1 py-2 bg-brand-card rounded-lg text-brand-text transition-all border border-white/10 shadow-sm">
                    <List size={18} />
                    <span className="text-[10px] font-bold">List</span>
                  </button>
                  <button className="flex flex-col items-center gap-1 py-2 hover:bg-white/5 rounded-lg text-brand-muted transition-all">
                    <LayoutGrid size={18} />
                    <span className="text-[10px] font-bold">Board</span>
                  </button>
                  <button className="flex flex-col items-center gap-1 py-2 hover:bg-white/5 rounded-lg text-brand-muted transition-all relative">
                    <CalendarIcon size={18} />
                    <span className="text-[10px] font-bold">Calendar</span>
                    <div className="absolute top-1 right-4 w-2 h-2 bg-brand-accent rounded-full border border-brand-card"></div>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-brand-bg border-t border-white/5 flex items-center justify-end gap-3">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-brand-text bg-brand-card border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 text-sm font-bold text-white bg-brand-accent/50 rounded-xl cursor-not-allowed transition-all">
                Add
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
