import React from 'react';
import { PanelLeftOpen, Settings } from 'lucide-react';

const THEMES = [
    { id: 'navy', label: 'Navy', color: '#0c0e14' },
    { id: 'slate', label: 'Slate', color: '#18181b' },
    { id: 'light', label: 'Light', color: '#f9fafb' },
];

const REASONING_OPTIONS = ['none', 'basic', 'deep', 'reflective'];

export default function SettingsPanel({ chatProps, modelProps, currentTheme, applyTheme, showToast, panelOpen, setPanelOpen }) {
    return (
        <div className="flex flex-col h-full bg-bg-main">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
                {!panelOpen && (
                    <button onClick={() => setPanelOpen(true)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-bg-hover text-text-muted transition-colors">
                        <PanelLeftOpen size={15} strokeWidth={1.5} />
                    </button>
                )}
                <h1 className="text-[16px] font-semibold text-text-primary">Settings</h1>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-[560px] flex flex-col gap-8">

                    {/* Model */}
                    <Section title="Model">
                        <div className="grid grid-cols-1 gap-2">
                            {modelProps.models.map(m => (
                                <button key={m.name}
                                    onClick={() => { modelProps.switchModel(m.name); showToast(`Switched to ${m.name}`, 'success'); }}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${modelProps.currentModel === m.name ? 'border-accent/50 bg-accent-dim text-text-primary' : 'border-border bg-bg-card hover:border-border-bright text-text-secondary'}`}>
                                    <div className={`w-2 h-2 rounded-full ${modelProps.currentModel === m.name ? 'bg-accent' : 'bg-text-muted'}`} />
                                    <span className="font-mono text-[13px]">{m.name}</span>
                                    {modelProps.currentModel === m.name && <span className="ml-auto font-mono text-[10px] text-accent uppercase tracking-wider">Active</span>}
                                </button>
                            ))}
                            {modelProps.models.length === 0 && (
                                <div className="text-[13px] text-text-muted py-3">No models available — is Ollama running?</div>
                            )}
                        </div>
                    </Section>

                    {/* Chat behavior */}
                    <Section title="Chat Behavior">
                        <ToggleRow label="Streaming" description="Stream responses token by token" checked={chatProps.streamingEnabled} onChange={chatProps.toggleStreaming} />
                        <ToggleRow label="Web Search" description="Enable real-time web search in chat" checked={chatProps.webSearchEnabled} onChange={chatProps.toggleWebSearch} />
                        <ToggleRow label="Notion Integration" description="Include Notion context in responses" checked={chatProps.notionEnabled} onChange={chatProps.toggleNotion} />

                        <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
                            <div>
                                <div className="text-[14px] text-text-primary font-medium">Reasoning Mode</div>
                                <div className="text-[12px] text-text-muted mt-0.5">Deep thinking level for responses</div>
                            </div>
                            <div className="flex gap-1">
                                {REASONING_OPTIONS.map(mode => (
                                    <button key={mode}
                                        onClick={() => { if (chatProps.reasoningMode !== mode) chatProps.toggleReasoning(); }}
                                        className={`px-2.5 py-1 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-colors border ${chatProps.reasoningMode === mode ? 'bg-accent-dim text-accent border-accent/40' : 'bg-bg-hover text-text-muted border-transparent hover:border-border'}`}>
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Section>

                    {/* Theme */}
                    <Section title="Theme">
                        <div className="flex gap-3">
                            {THEMES.map(({ id, label, color }) => (
                                <button key={id} onClick={() => applyTheme(id)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${currentTheme === id ? 'border-accent/50 bg-accent-dim' : 'border-border bg-bg-card hover:border-border-bright'}`}>
                                    <div className="w-8 h-8 rounded-full border border-border" style={{ background: color }} />
                                    <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">{label}</span>
                                </button>
                            ))}
                        </div>
                    </Section>

                    {/* About */}
                    <Section title="About">
                        <div className="p-4 bg-bg-card border border-border rounded-xl">
                            <div className="font-mono text-[12px] text-text-muted space-y-1.5">
                                <div><span className="text-text-secondary">System:</span> NEXUS AI Terminal v2.0</div>
                                <div><span className="text-text-secondary">User:</span> Adil Amejoud</div>
                                <div><span className="text-text-secondary">Status:</span> <span className={modelProps.isOnline ? 'text-positive' : 'text-error'}>{modelProps.isOnline ? '● Online' : '○ Offline'}</span></div>
                                <div><span className="text-text-secondary">Backend:</span> localhost:3700</div>
                            </div>
                        </div>
                    </Section>
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-muted mb-3">{title}</div>
            <div className="flex flex-col divide-y divide-border">{children}</div>
        </div>
    );
}

function ToggleRow({ label, description, checked, onChange }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div>
                <div className="text-[14px] text-text-primary font-medium">{label}</div>
                <div className="text-[12px] text-text-muted mt-0.5">{description}</div>
            </div>
            <button onClick={onChange}
                className={`relative w-[38px] h-[21px] rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-bg-hover border border-border'}`}>
                <div className={`absolute top-[3px] w-[15px] h-[15px] rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[19px]' : 'translate-x-[3px]'}`} />
            </button>
        </div>
    );
}
