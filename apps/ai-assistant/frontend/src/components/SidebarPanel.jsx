import React, { useState, useEffect, useRef } from 'react';
import {
  ClaudePlusCircle, ClaudeSearch, ClaudeX, ClaudeTrash, ClaudeSidebarLeft,
  ClaudeArrowLeft, ClaudeChat, ClaudeProjects,
  ClaudeCode, ClaudeArtifacts, ClaudeDownload, ClaudeCustomize
} from './ClaudeIcons';
import { motion, AnimatePresence } from 'motion/react';

export default function SidebarPanel({
  panelOpen, setPanelOpen,
  conversations, loading, loadConversations, deleteConversation,
  currentConversationId, loadConversation, newChat,
  currentView, setCurrentView,
  sidebarStack, sidebarPush, sidebarPop,
}) {
  const isRoot = sidebarStack.length === 1;
  const currentPanel = sidebarStack[sidebarStack.length - 1];
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const toggleSearch = () => {
    setSearchOpen(p => !p);
    if (!searchOpen) setTimeout(() => searchRef.current?.focus(), 60);
    else setSearchQuery('');
  };

  const filtered = searchQuery.trim()
    ? conversations.filter(c => c.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  const sidebarNavItems = [
    { id: 'chat', label: 'Chats', Icon: ClaudeChat },
    { id: 'projects', label: 'Projects', Icon: ClaudeProjects },
    { id: 'artifacts', label: 'Artifacts', Icon: ClaudeArtifacts },
    { id: 'code', label: 'Code', Icon: ClaudeCode },
  ];



  return (
    <div className={`sidebar flex flex-col h-full shrink-0 overflow-hidden bg-bg-sidebar transition-[width] duration-[220ms] ease-in-out border-r border-border ${panelOpen ? 'w-[260px]' : 'w-[60px] collapsed'}`}>
      <div className="w-full flex flex-col h-full relative">

        {/* ── Header ── */}
        <div className={`sidebar-header flex items-center justify-between pt-4 pb-0 shrink-0 h-[52px] ${panelOpen ? 'pr-3 pl-4' : 'px-0'}`}>
          {!panelOpen ? (
            <div className="w-full flex justify-center">
              <button onClick={() => setPanelOpen(true)}
                className="group relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                title="Expand sidebar">
                <ClaudeSidebarLeft size={16} className="shrink-0 group-hover:scale-105 transition-transform duration-200" />
              </button>
            </div>
          ) : isRoot ? (
            <>
              <div className="sidebar-header-title font-serif text-[18px] font-medium text-text-primary tracking-wide">NEXUS</div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => setPanelOpen(false)}
                  className="group w-7 h-7 rounded-md flex items-center justify-center hover:bg-bg-hover text-text-muted transition-colors"
                  title="Collapse sidebar">
                  <ClaudeSidebarLeft size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <button onClick={sidebarPop}
                className="group flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer p-0">
                <ClaudeArrowLeft size={16} />
              </button>
              <span className="font-sans text-[14px] font-medium text-text-primary truncate">{currentPanel.title}</span>
            </div>
          )}
        </div>

        {/* ── Nav / Content ── */}
        <div className="sidebar-content relative overflow-hidden flex-1 flex flex-col mt-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentPanel.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="nav-panel absolute inset-0 overflow-y-auto overflow-x-hidden flex flex-col"
            >
              {currentPanel.id === 'main' && (
                <div className="flex flex-col w-full h-full">
                  {/* Primary actions */}
                  <div className="flex flex-col mb-1 px-2 primary-actions mt-2">
                    <button className="group relative flex items-center px-3 py-2 text-text-primary hover:bg-bg-hover rounded-md transition-colors w-full text-left font-sans text-[14px]" onClick={() => { newChat(); setCurrentView('chat'); }} data-tooltip={!panelOpen ? "New Chat" : ""}>
                      <ClaudePlusCircle className="text-text-secondary shrink-0" size={16} />
                      <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${panelOpen ? 'opacity-100 ml-3 w-auto' : 'opacity-0 ml-0 w-0'}`}>New chat</span>
                    </button>
                    <button className="group relative flex items-center px-3 py-2 text-text-primary hover:bg-bg-hover rounded-md transition-colors w-full text-left font-sans text-[14px]" onClick={toggleSearch} data-tooltip={!panelOpen ? "Search" : ""}>
                      <ClaudeSearch size={16} className="text-text-secondary shrink-0" />
                      <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${panelOpen ? 'opacity-100 ml-3 w-auto' : 'opacity-0 ml-0 w-0'}`}>Search</span>
                    </button>
                    <button className={`group relative flex items-center px-3 py-2 text-text-primary hover:bg-bg-hover rounded-md transition-colors w-full text-left font-sans text-[14px] ${currentView === 'skills' ? 'bg-bg-hover text-text-primary' : 'text-text-secondary'}`} onClick={() => setCurrentView('skills')} data-tooltip={!panelOpen ? "Customize" : ""}>
                      <ClaudeCustomize size={16} className="text-text-secondary shrink-0" />
                      <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${panelOpen ? 'opacity-100 ml-3 w-auto' : 'opacity-0 ml-0 w-0'}`}>Customize</span>
                    </button>
                  </div>

                  {/* Search bar drop-down */}
                  <div className={`overflow-hidden transition-[max-height] duration-200 ${searchOpen && panelOpen ? 'max-h-[44px]' : 'max-h-0'}`}>
                    <div className="flex items-center gap-2 bg-bg-card rounded-md px-3 py-1.5 mx-3 mb-1 mt-1 border border-border">
                      <ClaudeSearch size={14} className="text-text-muted shrink-0" />
                      <input ref={searchRef} type="text" placeholder="Search chats…" value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Escape' && toggleSearch()}
                        className="bg-transparent border-none outline-none font-sans text-[13px] text-text-primary placeholder:text-text-muted flex-1 min-w-0" />
                      {searchQuery && <button onClick={() => setSearchQuery('')} className="text-text-muted hover:text-text-primary"><ClaudeX size={12} strokeWidth={1.75} /></button>}
                    </div>
                  </div>

                  <div className={`h-px bg-border my-2 transition-all duration-300 ${panelOpen ? 'mx-4' : 'mx-3'}`} />

                  {/* Nav items */}
                  <div className="flex flex-col px-2 mt-2">
                    {sidebarNavItems.map(({ id, label, Icon, action }) => (
                      <button key={id}
                        className={`group relative flex items-center px-3 py-2 transition-colors font-sans text-[14px] rounded-md w-full text-left ${currentView === id ? 'bg-bg-hover text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}
                        onClick={() => action ? action() : setCurrentView(id)}
                        data-tooltip={!panelOpen ? label : ""}>
                        <Icon size={16} className="shrink-0" />
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${panelOpen ? 'opacity-100 ml-3 w-auto' : 'opacity-0 ml-0 w-0'}`}>{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Recent conversations */}
                  <div className={`flex flex-col mt-4 overflow-hidden transition-opacity duration-300 flex-1 ${panelOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                    <div className="px-5 mb-1 font-sans text-[12px] font-medium text-text-muted whitespace-nowrap">Recents</div>
                    {loading ? (
                      <div className="px-3">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="flex flex-col my-px py-2 gap-1.5 px-2">
                            <div className="h-3 bg-bg-hover rounded animate-pulse w-3/4" />
                          </div>
                        ))}
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="px-5 py-3 text-[13px] text-text-muted whitespace-nowrap">
                        {searchQuery ? 'No matching chats' : 'No recent chats'}
                      </div>
                    ) : (
                      <div className="flex flex-col pb-4 overflow-y-auto">
                        {filtered.map(c => {
                          const active = currentConversationId === c.id && currentView === 'chat';
                          return (
                            <div key={c.id}
                              onClick={() => loadConversation(c.id)}
                              className={`group flex items-center mx-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${active ? 'bg-bg-hover text-text-primary' : 'hover:bg-bg-hover text-text-secondary'}`}>
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="truncate text-[13.5px] font-sans leading-tight whitespace-nowrap">{c.title || 'Untitled'}</div>
                              </div>
                              <div className="hidden group-hover:flex items-center shrink-0">
                                <button onClick={e => { e.stopPropagation(); if (window.confirm('Delete this conversation?')) deleteConversation(c.id); }} className="group text-text-muted hover:text-text-primary p-1 transition-colors">
                                  <ClaudeTrash size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className="mt-auto shrink-0 border-t border-border overflow-hidden">
          <div className="flex items-center p-3">
            <div className={`flex ${panelOpen ? 'flex-row items-center w-full gap-2 p-1.5 rounded-lg hover:bg-bg-hover cursor-pointer transition-colors' : 'flex-col items-center gap-4 w-full justify-center'}`} onClick={() => setCurrentView('settings')}>
              <div className="flex shrink-0 relative items-center justify-center">
                {!panelOpen && (
                  <button className="text-text-muted hover:text-text-primary transition-colors cursor-pointer absolute -top-[36px]" data-tooltip="Download app">
                    <ClaudeDownload size={16} strokeWidth={1.5} />
                  </button>
                )}
                <div className="w-8 h-8 rounded-full bg-[#d8ccb8] text-[#1a1b1e] text-[13px] font-mono font-medium flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity">AA</div>
              </div>

              <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${panelOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                <div className="text-[13.5px] font-medium text-text-primary truncate">Adil Amejoud</div>
                <div className="text-[11.5px] text-text-muted truncate">Free plan</div>
              </div>
              <div className={`flex items-center gap-1 text-text-muted ml-auto mr-1 transition-all duration-300 ${panelOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                <ClaudeDownload size={16} strokeWidth={1.5} className="md:block hidden hover:text-text-primary transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
