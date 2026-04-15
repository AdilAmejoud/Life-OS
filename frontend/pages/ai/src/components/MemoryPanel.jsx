import React, { useEffect } from 'react';
import { Database, PanelLeftOpen, Brain } from 'lucide-react';

export default function MemoryPanel({ memories, userData, loading, loadMemory, addMemory, addUserData, showToast, panelOpen, setPanelOpen }) {
    useEffect(() => { loadMemory(); }, [loadMemory]);

    return (
        <div className="flex flex-col h-full bg-bg-main">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
                {!panelOpen && (
                    <button onClick={() => setPanelOpen(true)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-bg-hover text-text-muted transition-colors">
                        <PanelLeftOpen size={15} strokeWidth={1.5} />
                    </button>
                )}
                <h1 className="text-[16px] font-semibold text-text-primary">Memory</h1>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-text-muted text-[13px]">Loading memory…</div>
                ) : (
                    <>
                        <Section title="AI Memory" icon={<Brain size={14} strokeWidth={1.5} />} items={memories}
                            renderItem={item => (
                                <div key={item.id || item.key} className="p-3 bg-bg-card border border-border rounded-xl">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted bg-bg-hover px-1.5 py-0.5 rounded">{item.type || 'memory'}</span>
                                        <span className="font-mono text-[11px] text-text-secondary font-medium">{item.key}</span>
                                    </div>
                                    <div className="text-[13px] text-text-primary">{typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)}</div>
                                </div>
                            )}
                        />

                        <div className="mt-6" />

                        <Section title="User Data" icon={<Database size={14} strokeWidth={1.5} />} items={userData}
                            renderItem={item => (
                                <div key={`${item.category}-${item.key}`} className="p-3 bg-bg-card border border-border rounded-xl">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted bg-bg-hover px-1.5 py-0.5 rounded">{item.category}</span>
                                        <span className="font-mono text-[11px] text-text-secondary font-medium">{item.key}</span>
                                        {item.confidence != null && (
                                            <span className="ml-auto font-mono text-[10px] text-text-muted">{Math.round(item.confidence * 100)}%</span>
                                        )}
                                    </div>
                                    <div className="text-[13px] text-text-primary">{typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)}</div>
                                </div>
                            )}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

function Section({ title, icon, items, renderItem }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-text-muted">{icon}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-muted">{title}</span>
                <span className="font-mono text-[10px] text-text-muted">({items.length})</span>
            </div>
            {items.length === 0 ? (
                <div className="text-[13px] text-text-muted py-4 text-center">No entries</div>
            ) : (
                <div className="flex flex-col gap-2">{items.map(renderItem)}</div>
            )}
        </div>
    );
}
