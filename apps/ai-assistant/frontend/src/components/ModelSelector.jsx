import React, { useEffect, useRef } from 'react';

export default function ModelSelector({ models }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        models.closeDropdown();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [models]);

  return (
    <div ref={ref} className="absolute bottom-full left-0 mb-2 w-64 bg-surface-container-highest border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
      <div className="p-2 border-b border-white/5">
        <span className="font-mono text-[10px] text-outline uppercase tracking-widest px-2">Available Models</span>
      </div>
      <div className="max-h-60 overflow-y-auto p-1">
        {models.models.map(m => (
          <button
            key={m.name}
            onClick={() => models.switchModel(m.name)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-body flex items-center justify-between ${models.currentModel === m.name ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-container-high'}`}
          >
            <span className="truncate">{m.name}</span>
            {models.currentModel === m.name && <span className="material-symbols-outlined text-[16px]">check</span>}
          </button>
        ))}
        {models.models.length === 0 && <div className="p-3 text-xs text-outline text-center">No models found</div>}
      </div>
    </div>
  );
}
