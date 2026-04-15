import React from 'react';
import { Briefcase, AppWindow, Blocks, Key } from 'lucide-react';

export default function CustomizeView({ showToast, panelOpen, setPanelOpen, sidebarPush, setCurrentView }) {
  const handleConnectApps = () => {
    sidebarPush({ id: 'connectors', title: 'Connectors' });
    setCurrentView('connectors-detail');
    setPanelOpen(false);
  };

  const handleCreateSkills = () => {
    sidebarPush({ id: 'skills', title: 'Skills' });
    setCurrentView('skills-detail');
    setPanelOpen(false);
  };

  const handleCredentials = () => {
    sidebarPush({ id: 'credentials', title: 'Credentials' });
    setCurrentView('credentials');
    setPanelOpen(false);
  };

  return (
    <div className="flex flex-col h-full w-full bg-bg-main items-center justify-center">
      <div className="max-w-[480px] w-full px-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">

        <div className="w-16 h-16 mb-4 text-[#e4d9c5]">
          <Briefcase size={64} strokeWidth={1} />
        </div>

        <h1 className="font-serif text-[32px] text-[#e4d9c5] font-normal leading-[1.1] mb-3">
          Customize NEXUS
        </h1>
        <p className="text-[14px] text-text-muted mb-10">
          Skills, connectors, and plugins shape how NEXUS works with you.
        </p>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleConnectApps}
            className="flex items-start gap-4 p-5 rounded-xl border border-border bg-[#22242a]/50 hover:bg-[#2a2c31] transition-colors text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#2a2c31] border border-border flex items-center justify-center text-text-primary shrink-0 group-hover:bg-[#33353b] transition-colors">
              <AppWindow size={16} strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-medium text-[#e4d9c5]">Connect your apps</span>
              <span className="text-[13.5px] text-text-muted">Let NEXUS read and write to the tools you already use.</span>
            </div>
          </button>

          <button
            onClick={handleCreateSkills}
            className="flex items-start gap-4 p-5 rounded-xl border border-border bg-[#22242a]/50 hover:bg-[#2a2c31] transition-colors text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#2a2c31] border border-border flex items-center justify-center text-text-primary shrink-0 group-hover:bg-[#33353b] transition-colors">
              <Blocks size={16} strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-medium text-[#e4d9c5]">Create new skills</span>
              <span className="text-[13.5px] text-text-muted">Teach NEXUS your processes, team norms, and expertise.</span>
            </div>
          </button>

          <button
            onClick={handleCredentials}
            className="flex items-start gap-4 p-5 rounded-xl border border-border bg-[#22242a]/50 hover:bg-[#2a2c31] transition-colors text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#2a2c31] border border-border flex items-center justify-center text-text-primary shrink-0 group-hover:bg-[#33353b] transition-colors">
              <Key size={16} strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-medium text-[#e4d9c5]">Credentials</span>
              <span className="text-[13.5px] text-text-muted">Manage API keys and authentication tokens for your integrations.</span>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
