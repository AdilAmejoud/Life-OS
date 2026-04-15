import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  UserPlus, 
  Activity, 
  Printer, 
  Gift, 
  Zap, 
  RefreshCw, 
  LogOut, 
  ChevronDown,
  TrendingUp,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
      >
        <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center overflow-hidden border border-white/10">
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDYn8r2535mrpcjYzkirxRnFxRazCtulYtTKN9ZpuandAbMaued3_4SNDB5z0pPpthITqP3PQxYBiQDzKtjSbsBFOZE6AxI6RgPrQfSUBC4HVShyq-Jw_SYO5DB-JMpIaVjiUYF3qheTME-Sm0sQeIdUV75dEuEFb6JBt5wmZ6xAoR1Nuq3QkUFqXyYh3xdfcRPqTQvBXYpm7B2BIE2pPL7F0BEBC_ptjD3VjRczGtMHX8S4bDv8-L0LXfzFOyLlqO9PY_rVsB" 
            alt="Profile"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <span className="text-sm font-semibold text-brand-text">Adil</span>
        <ChevronDown size={14} className={`text-brand-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 mt-1 w-72 bg-brand-card rounded-xl shadow-2xl border border-white/10 z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center overflow-hidden border border-white/10">
                  <img 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDYn8r2535mrpcjYzkirxRnFxRazCtulYtTKN9ZpuandAbMaued3_4SNDB5z0pPpthITqP3PQxYBiQDzKtjSbsBFOZE6AxI6RgPrQfSUBC4HVShyq-Jw_SYO5DB-JMpIaVjiUYF3qheTME-Sm0sQeIdUV75dEuEFb6JBt5wmZ6xAoR1Nuq3QkUFqXyYh3xdfcRPqTQvBXYpm7B2BIE2pPL7F0BEBC_ptjD3VjRczGtMHX8S4bDv8-L0LXfzFOyLlqO9PY_rVsB" 
                    alt="Profile"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-bold text-brand-text">Adil Amejoud</span>
                  <span className="text-[11px] text-brand-muted">0/5 tasks</span>
                </div>
                <div className="text-[10px] text-brand-muted/50 font-medium">O then P</div>
              </div>
            </div>

            <div className="p-1.5">
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-brand-text hover:bg-white/5 rounded-lg transition-colors group">
                <Settings size={16} className="text-brand-muted group-hover:text-brand-text" />
                <span className="flex-1 text-left">Settings</span>
                <span className="text-[10px] text-brand-muted/50 font-medium">O then S</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-brand-text hover:bg-white/5 rounded-lg transition-colors group">
                <Plus size={16} className="text-brand-muted group-hover:text-brand-text" />
                <span className="flex-1 text-left">Add a team</span>
              </button>
            </div>

            <div className="p-1.5 border-t border-white/5">
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-brand-text hover:bg-white/5 rounded-lg transition-colors group">
                <TrendingUp size={16} className="text-brand-muted group-hover:text-brand-text" />
                <span className="flex-1 text-left">Activity log</span>
                <span className="text-[10px] text-brand-muted/50 font-medium">G then A</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-brand-text hover:bg-white/5 rounded-lg transition-colors group">
                <Printer size={16} className="text-brand-muted group-hover:text-brand-text" />
                <span className="flex-1 text-left">Print</span>
                <span className="text-[10px] text-brand-muted/50 font-medium">Ctrl P</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-brand-text hover:bg-white/5 rounded-lg transition-colors group">
                <Gift size={16} className="text-brand-muted group-hover:text-brand-text" />
                <span className="flex-1 text-left">What's new</span>
              </button>
            </div>

            <div className="p-1.5 border-t border-white/5">
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors group">
                <Zap size={16} className="text-brand-accent" />
                <span className="flex-1 text-left font-semibold">Try Pro for free</span>
              </button>
            </div>

            <div className="p-1.5 border-t border-white/5">
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-brand-text hover:bg-white/5 rounded-lg transition-colors group">
                <RefreshCw size={16} className="text-brand-muted group-hover:text-brand-text" />
                <span className="flex-1 text-left">Sync</span>
                <span className="text-[10px] text-brand-muted/50 font-medium">30 minutes ago</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-brand-text hover:bg-white/5 rounded-lg transition-colors group">
                <LogOut size={16} className="text-brand-muted group-hover:text-brand-text" />
                <span className="flex-1 text-left">Log out</span>
              </button>
            </div>

            <div className="px-4 py-3 bg-brand-bg/50 flex items-center justify-between text-[10px] text-brand-muted/50 border-t border-white/5">
              <span>v9969</span>
              <button className="hover:text-brand-text transition-colors underline-offset-2 hover:underline">Changelog</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
