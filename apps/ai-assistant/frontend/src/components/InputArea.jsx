import React, { useRef, useState, useEffect } from 'react';
import { Plus, X, Globe, Camera, Database, Network, PenTool, ArrowUp, Square, ChevronDown, Paperclip, ChevronRight, Check } from 'lucide-react';

export default function InputArea({
  input, setInput,
  attachedFiles, setAttachedFiles, removeAttachment,
  notionEnabled, toggleNotion,
  webSearchEnabled, toggleWebSearch,
  reasoningMode, toggleReasoning,
  streamingEnabled, toggleStreaming,
  isLoading, isStreaming,
  sendMessage, stopStreaming,
  models,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [plusOpen, setPlusOpen] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const plusRef = useRef(null);

  // Dynamic Model Slicing
  const availableModels = models?.models || [];
  const topModels = availableModels.slice(0, 3);
  const overflowModels = availableModels.slice(3);

  const getModelSubtitle = (index) => {
    if (index === 0) return "Most capable for complex work";
    if (index === 1) return "Most efficient for everyday tasks";
    if (index === 2) return "Fastest for quick answers";
    return "";
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && (input.trim() || attachedFiles.length > 0)) {
        sendMessage();
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }
    }
  };

  useEffect(() => {
    if (!plusOpen) return;
    const handler = (e) => { if (!plusRef.current?.contains(e.target)) setPlusOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [plusOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['txt', 'md', 'json', 'csv', 'js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'yml', 'yaml', 'sh'];
    if (!allowed.includes(ext)) { alert('Unsupported file type'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('File too large (max 2MB)'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAttachedFiles(prev => [...prev, { name: file.name, content: ev.target.result }]);
    reader.readAsText(file);
    e.target.value = '';
  };

  const plusMenuItems = [
    { label: 'Add files or photos', Icon: Paperclip, onClick: () => { fileInputRef.current?.click(); setPlusOpen(false); } },
    { label: 'Take a screenshot', Icon: Camera, onClick: () => setPlusOpen(false) },
    { label: 'Add to project', Icon: Database, chevron: true, onClick: () => setPlusOpen(false) },
    { divider: true },
    { label: 'Skills', Icon: Plus, chevron: true, onClick: () => setPlusOpen(false) },
    { label: 'Connectors', Icon: Network, chevron: true, active: notionEnabled, onClick: toggleNotion },
    { divider: true },
    { label: 'Web search', Icon: Globe, check: true, blue: true, active: webSearchEnabled, onClick: toggleWebSearch },
    { label: 'Use style', Icon: PenTool, chevron: true, onClick: () => setPlusOpen(false) },
    { divider: true },
    { label: 'Create & edit styles', Icon: Plus, special: true, onClick: () => setPlusOpen(false) },
  ];

  return (
    <>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange}
        accept=".txt,.md,.json,.csv,.js,.jsx,.ts,.tsx,.py,.html,.css,.yml,.yaml,.sh" />

      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-bg-card px-2.5 py-1 rounded-full text-[12px] border border-border">
              <span className="truncate max-w-[150px] text-text-secondary">{file.name}</span>
              <button onClick={() => removeAttachment(idx)} className="text-text-muted hover:text-error transition-colors"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex flex-col bg-bg-input border border-border rounded-[20px] px-3.5 pt-3.5 pb-2.5 focus-within:border-border focus-within:bg-bg-card transition-all duration-300 shadow-sm">

        {/* Top: Text Area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          placeholder="How can I help you today?"
          disabled={isLoading && !isStreaming}
          rows={1}
          className="w-full bg-transparent border-none outline-none text-[15px] leading-relaxed text-text-primary placeholder:text-text-muted resize-none min-h-[44px] max-h-[400px] px-1 pb-2"
        />

        {/* Bottom: Action Row */}
        <div className="flex items-center justify-between w-full mt-2">
          {/* Left Actions */}
          <div ref={plusRef} className="plus-menu-wrapper relative">
            <button onClick={() => setPlusOpen(p => !p)} className={`w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors ${plusOpen ? 'bg-bg-hover text-text-primary' : ''}`} title="Options">
              <Plus size={20} strokeWidth={1.5} />
            </button>
            {plusOpen && (
              <div className="absolute left-0 bottom-full mb-3 w-[260px] bg-[#2a2b2f] border border-border/60 rounded-[14px] shadow-2xl py-1.5 z-50 flex flex-col font-sans text-[13.5px] text-text-secondary animate-in slide-in-from-bottom-2 zoom-in-95 duration-200">
                {plusMenuItems.map((item, i) => {
                  if (item.divider) return <div key={`div-${i}`} className="h-px bg-border/40 my-1 mx-3" />;

                  const { label, Icon, chevron, check, blue, special, active, onClick } = item;
                  const isActiveBlue = active && blue;

                  return (
                    <button key={label} onClick={onClick} className={`flex items-center justify-between w-full px-3 py-2 hover:bg-bg-hover transition-colors gap-3 ${isActiveBlue ? 'text-accent' : 'text-[#e6e2db]'}`}>
                      <div className="flex items-center gap-3">
                        <Icon size={16} strokeWidth={1.5} className={isActiveBlue ? 'text-accent opacity-100' : 'text-text-muted opacity-80'} />
                        <span className="font-normal">{label}</span>
                      </div>
                      {chevron && <ChevronRight size={14} className="text-text-muted opacity-60" />}
                      {check && active && <Check size={14} strokeWidth={2} className="text-accent" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <div onClick={models.toggleDropdown}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-bg-hover text-[#e6e2db] transition-colors">
                <span className="font-sans text-[13.5px] max-w-[120px] truncate">{models.currentModel || (topModels[0]?.name || 'Select Model')}</span>
                <ChevronDown size={14} strokeWidth={1.5} className="opacity-60" />
              </div>

              {models.dropdownOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-[300px] bg-[#2a2b2f] border border-border/60 rounded-[14px] shadow-2xl overflow-visible z-50 py-1.5 animate-in slide-in-from-bottom-2 zoom-in-95 duration-200">
                  {topModels.map((m, index) => {
                    const isSelected = models.currentModel === m.name;
                    return (
                      <button key={m.name} onClick={() => { models.switchModel(m.name); models.toggleDropdown(); setShowOverflow(false); }} className="w-full flex justify-between items-center px-4 py-2 hover:bg-bg-hover group transition-colors">
                        <div className="flex flex-col text-left">
                          <span className="text-[14px] text-[#e6e2db] truncate max-w-[200px]">{m.name}</span>
                          <span className="text-[12px] text-text-muted opacity-80">{getModelSubtitle(index)}</span>
                        </div>
                        {isSelected && <Check size={16} strokeWidth={2} className="text-[#6495ed]" />}
                        {!isSelected && index === 0 && <span className="px-2 py-0.5 rounded-full border border-border/60 text-[11px] text-[#e6e2db] group-hover:border-accent/40 transition-colors">Local</span>}
                      </button>
                    )
                  })}

                  {topModels.length === 0 && (
                    <div className="px-4 py-3 text-[13px] text-text-muted text-center">No models detected</div>
                  )}

                  <div className="h-px bg-border/40 my-2 mx-4" />

                  <div className="flex justify-between items-center px-4 py-2 cursor-default">
                    <div className="flex flex-col text-left pointer-events-none">
                      <span className="text-[14px] text-[#e6e2db]">Extended thinking</span>
                      <span className="text-[12px] text-text-muted opacity-80">Think longer for complex tasks</span>
                    </div>
                    {/* iOS style toggle */}
                    <button onClick={() => toggleReasoning('deep')} className={`w-10 h-6 pt-0.5 rounded-full flex items-center transition-colors px-[3px] ${reasoningMode !== 'none' ? 'bg-[#e6e2db]' : 'bg-[#4a4b50]'}`}>
                      <div className={`w-[20px] h-[20px] rounded-full bg-[#2a2b2f] transition-transform duration-300 ease-in-out shadow-sm ${reasoningMode !== 'none' ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="h-px bg-border/40 my-1 mx-4" />

                  {overflowModels.length > 0 && (
                    <div className="relative" onMouseEnter={() => setShowOverflow(true)} onMouseLeave={() => setShowOverflow(false)}>
                      <button className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-bg-hover transition-colors text-left group">
                        <span className="text-[14px] text-[#e6e2db]">More models</span>
                        <ChevronRight size={14} className="text-text-muted opacity-60 group-hover:opacity-100 transition-opacity" />
                      </button>

                      {showOverflow && (
                        <div className="absolute left-[calc(100%+6px)] bottom-0 w-[240px] bg-[#2a2b2f] border border-border/60 rounded-[14px] shadow-2xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150">
                          {overflowModels.map(m => {
                            const isSelected = models.currentModel === m.name;
                            return (
                              <button key={m.name} onClick={() => { models.switchModel(m.name); models.toggleDropdown(); setShowOverflow(false); }} className="w-full flex justify-between items-center px-4 py-2 hover:bg-bg-hover transition-colors text-left group">
                                <span className="text-[13.5px] text-[#e6e2db] truncate max-w-[150px]">{m.name}</span>
                                {isSelected ? (
                                  <Check size={14} strokeWidth={2} className="text-[#6495ed]" />
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full border border-border/60 text-[10px] text-text-muted group-hover:border-accent/40 transition-colors opacity-0 group-hover:opacity-100">Local</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {input.trim() || attachedFiles.length > 0 || isStreaming ? (
              isStreaming ? (
                <button onClick={stopStreaming}
                  className="w-8 h-8 rounded-full bg-bg-card border border-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors animate-in zoom-in duration-200"
                  title="Stop streaming">
                  <Square size={14} strokeWidth={1.5} />
                </button>
              ) : (
                <button onClick={sendMessage}
                  disabled={isLoading}
                  className="w-8 h-8 rounded-full bg-text-primary flex items-center justify-center text-bg-main disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 animate-in zoom-in duration-200 shadow-sm"
                  title="Send message">
                  <ArrowUp size={18} strokeWidth={2.5} />
                </button>
              )
            ) : null}
          </div>
        </div>
      </div>

    </>
  );
}
