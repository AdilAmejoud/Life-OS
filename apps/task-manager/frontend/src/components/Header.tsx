import React from 'react';
import { Search, Bell, Settings, HelpCircle, Layers } from 'lucide-react';

export const Header = () => {
  return (
    <header id="header" className="h-16 flex-shrink-0 border-b border-white/5 bg-brand-surface px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="hidden md:flex items-center bg-brand-card rounded-xl px-3 py-2 w-full max-w-xs border border-white/5 focus-within:bg-brand-bg transition-all group">
          <Search size={18} className="text-brand-muted group-focus-within:text-brand-accent transition-colors" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm w-full placeholder:text-brand-muted ml-2 text-brand-text"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="w-10 h-10 flex items-center justify-center rounded-xl text-brand-muted hover:bg-white/5 hover:text-brand-text transition-all relative">
          <Bell size={20} />
        </button>
        
        <div className="w-px h-6 bg-white/10 mx-2"></div>
        
        <div className="w-9 h-9 rounded-full bg-brand-card overflow-hidden border-2 border-white/10 shadow-sm cursor-pointer hover:ring-2 hover:ring-brand-accent/20 transition-all">
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDYn8r2535mrpcjYzkirxRnFxRazCtulYtTKN9ZpuandAbMaued3_4SNDB5z0pPpthITqP3PQxYBiQDzKtjSbsBFOZE6AxI6RgPrQfSUBC4HVShyq-Jw_SYO5DB-JMpIaVjiUYF3qheTME-Sm0sQeIdUV75dEuEFb6JBt5wmZ6xAoR1Nuq3QkUFqXyYh3xdfcRPqTQvBXYpm7B2BIE2pPL7F0BEBC_ptjD3VjRczGtMHX8S4bDv8-L0LXfzFOyLlqO9PY_rVsB" 
            alt="User"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </header>
  );
};
