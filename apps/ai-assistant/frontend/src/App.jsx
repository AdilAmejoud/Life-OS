import React, { useState, useEffect, useCallback } from 'react';
import { useChat } from './hooks/useChat';
import { useConversations } from './hooks/useConversations';
import { useModels } from './hooks/useModels';
import { useTasks } from './hooks/useTasks';
import { useMemory } from './hooks/useMemory';
import { useToast } from './components/Toast';

import SidebarPanel from './components/SidebarPanel';
import ChatView from './components/ChatView';
import ProjectsView from './components/ProjectsView';
import ArtifactsView from './components/ArtifactsView';
import CustomizeView from './components/CustomizeView';
import SettingsPanel from './components/SettingsPanel';
import CommandPalette from './components/CommandPalette';
import Toast from './components/Toast';
import SkillsDetailView from './components/SkillsDetailView';
import ConnectorsDetailView from './components/ConnectorsDetailView';
import CredentialManager from './components/CredentialManager';

const THEMES = ['navy', 'slate', 'light'];

function safeStorageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeStorageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

export default function App() {
  const [currentView, setCurrentView] = useState('chat');
  const [panelOpen, setPanelOpen] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => safeStorageGet('theme') || 'navy');
  const [sidebarStack, setSidebarStack] = useState([{ id: 'main', title: null }]);

  // ── Theme ──────────────────────────────────────────────────────────────────
  const applyTheme = useCallback((t) => {
    setCurrentTheme(t);
    safeStorageSet('theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  useEffect(() => { applyTheme(currentTheme); }, []); // eslint-disable-line

  // ── Sidebar stack navigation ────────────────────────────────────────────────
  const sidebarPush = (panel) => { setSidebarStack(prev => [...prev, panel]); setPanelOpen(true); };
  const sidebarPop = () => {
    setSidebarStack(prev => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  };

  // ── Data hooks ─────────────────────────────────────────────────────────────
  const convProps = useConversations();
  const chatProps = useChat(convProps.loadConversations);
  const modelProps = useModels();
  const taskProps = useTasks();
  const memProps = useMemory();
  const { toasts, showToast } = useToast();

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    modelProps.fetchModels();
    modelProps.fetchHealth();
    const savedId = safeStorageGet('currentConversationId');
    if (savedId && savedId !== 'new') {
      chatProps.setCurrentConversationId(savedId);
      convProps.loadConversation(savedId).then(msgs => { if (msgs) chatProps.setMessages(msgs); });
    }
  }, []); // eslint-disable-line

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); setPanelOpen(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Command palette actions ────────────────────────────────────────────────
  const commands = [
    { id: 'new-chat', label: 'New Chat', shortcut: '⌘N', action: () => { chatProps.newChat(); setCurrentView('chat'); } },
    { id: 'clear-chat', label: 'Clear Chat', action: () => chatProps.setMessages([]) },
    { id: 'toggle-stream', label: `${chatProps.streamingEnabled ? 'Disable' : 'Enable'} Streaming`, action: chatProps.toggleStreaming },
    { id: 'toggle-search', label: `${chatProps.webSearchEnabled ? 'Disable' : 'Enable'} Web Search`, action: chatProps.toggleWebSearch },
    { id: 'toggle-notion', label: `${chatProps.notionEnabled ? 'Disable' : 'Enable'} Notion`, action: chatProps.toggleNotion },
    { id: 'toggle-sidebar', label: 'Toggle Sidebar', shortcut: '⌘B', action: () => setPanelOpen(p => !p) },
    { id: 'view-projects', label: 'View Projects', action: () => setCurrentView('projects') },
    { id: 'view-artifacts', label: 'View Artifacts', action: () => setCurrentView('artifacts') },
    { id: 'view-skills', label: 'Customize', action: () => setCurrentView('skills') },
    { id: 'view-settings', label: 'Settings', action: () => setCurrentView('settings') },
    { id: 'theme-navy', label: 'Theme: Navy', action: () => applyTheme('navy') },
    { id: 'theme-slate', label: 'Theme: Slate', action: () => applyTheme('slate') },
    { id: 'theme-light', label: 'Theme: Light', action: () => applyTheme('light') },
  ];

  // ── Shared props ───────────────────────────────────────────────────────────
  const panelProps = { panelOpen, setPanelOpen };

  return (
    <div className="flex h-screen w-full bg-bg-main text-text-primary overflow-hidden font-sans">
      <SidebarPanel
        {...panelProps}
        conversations={convProps.conversations}
        loading={convProps.loading}
        loadConversations={convProps.loadConversations}
        deleteConversation={convProps.deleteConversation}
        currentConversationId={chatProps.currentConversationId}
        loadConversation={async (id) => {
          const msgs = await convProps.loadConversation(id);
          chatProps.setMessages(msgs || []);
          chatProps.setCurrentConversationId(id);
          setCurrentView('chat');
        }}
        newChat={() => { chatProps.newChat(); setCurrentView('chat'); }}
        currentView={currentView}
        setCurrentView={setCurrentView}
        sidebarStack={sidebarStack}
        sidebarPush={sidebarPush}
        sidebarPop={sidebarPop}
        taskProps={taskProps}
        currentTheme={currentTheme}
        applyTheme={applyTheme}
        themes={THEMES}
      />

      <main id={`view-${currentView}`} className="flex-1 flex flex-col overflow-hidden bg-bg-main min-w-0">
        {currentView === 'chat' && (
          <ChatView
            {...chatProps}
            models={modelProps}
            showToast={showToast}
            conversations={convProps.conversations}
            setCmdOpen={setCmdOpen}
            setPanelOpen={setPanelOpen}
            panelOpen={panelOpen}
            setCurrentView={setCurrentView}
            toolSteps={chatProps.toolSteps}
          />
        )}
        {currentView === 'projects' && (
          <ProjectsView panelOpen={panelOpen} setPanelOpen={setPanelOpen} />
        )}
        {currentView === 'artifacts' && (
          <ArtifactsView panelOpen={panelOpen} setPanelOpen={setPanelOpen} />
        )}
        {currentView === 'skills' && (
          <CustomizeView
            panelOpen={panelOpen}
            setPanelOpen={setPanelOpen}
            sidebarPush={sidebarPush}
            setCurrentView={setCurrentView}
            showToast={showToast}
          />
        )}
        {currentView === 'skills-detail' && (
          <SkillsDetailView panelOpen={panelOpen} setPanelOpen={setPanelOpen} showToast={showToast} />
        )}
        {currentView === 'connectors-detail' && (
          <ConnectorsDetailView panelOpen={panelOpen} setPanelOpen={setPanelOpen} showToast={showToast} />
        )}
        {currentView === 'credentials' && (
          <CredentialManager panelOpen={panelOpen} setPanelOpen={setPanelOpen} showToast={showToast} />
        )}
        {currentView === 'settings' && (
          <SettingsPanel
            chatProps={chatProps}
            modelProps={modelProps}
            currentTheme={currentTheme}
            applyTheme={applyTheme}
            showToast={showToast}
            panelOpen={panelOpen}
            setPanelOpen={setPanelOpen}
          />
        )}
      </main>

      <CommandPalette commands={commands} isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
      <Toast toasts={toasts} />
    </div>
  );
}
