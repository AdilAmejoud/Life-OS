import React, { useState, useEffect, useRef } from 'react';
import { Command } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CommandPalette({ commands, isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = query.trim()
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(p => Math.min(p + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(p => Math.max(p - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[selected];
      if (cmd) { cmd.action(); onClose(); }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[20vh] z-[2000]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}>
          <motion.div
            className="w-[480px] max-w-[92vw] bg-bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: -10, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -6, scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={e => e.stopPropagation()}>

            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Command size={15} strokeWidth={1.5} className="text-text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search commands…"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(0); }}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none outline-none text-[14px] text-text-primary placeholder:text-text-muted"
              />
              <kbd className="font-mono text-[10px] text-text-muted bg-bg-hover border border-border rounded px-1.5 py-0.5">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[320px] overflow-y-auto py-1.5">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-[13px] text-text-muted">No commands found</div>
              ) : (
                filtered.map((cmd, i) => (
                  <button key={cmd.id}
                    onClick={() => { cmd.action(); onClose(); }}
                    onMouseEnter={() => setSelected(i)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${selected === i ? 'bg-bg-hover' : ''}`}>
                    <span className={`text-[14px] ${selected === i ? 'text-text-primary' : 'text-text-secondary'}`}>{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="font-mono text-[10px] text-text-muted bg-bg-hover border border-border rounded px-1.5 py-0.5 shrink-0">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
