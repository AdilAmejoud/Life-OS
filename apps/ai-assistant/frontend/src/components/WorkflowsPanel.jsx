import React, { useState, useEffect } from 'react';
import { Workflow, Play, PanelLeftOpen, RefreshCw } from 'lucide-react';
import { getN8nWorkflows, triggerWorkflow } from '../utils/api';

export default function WorkflowsPanel({ showToast, panelOpen, setPanelOpen }) {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [triggering, setTriggering] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getN8nWorkflows();
            setWorkflows(Array.isArray(data) ? data : (data.workflows || []));
        } catch (e) {
            showToast('Failed to load workflows', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []); // eslint-disable-line

    const handleTrigger = async (wf) => {
        setTriggering(wf.id);
        try {
            await triggerWorkflow(wf.id);
            showToast(`Triggered: ${wf.name}`, 'success');
        } catch (e) {
            showToast(`Failed to trigger: ${e.message}`, 'error');
        } finally {
            setTriggering(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-bg-main">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                    {!panelOpen && (
                        <button onClick={() => setPanelOpen(true)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-bg-hover text-text-muted transition-colors">
                            <PanelLeftOpen size={15} strokeWidth={1.5} />
                        </button>
                    )}
                    <h1 className="text-[16px] font-semibold text-text-primary">n8n Workflows</h1>
                    <span className="font-mono text-[10px] text-text-muted bg-bg-card px-2 py-0.5 rounded-full border border-border">{workflows.length}</span>
                </div>
                <button onClick={load} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors" title="Refresh">
                    <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-text-muted text-[13px]">Loading workflows…</div>
                ) : workflows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-text-muted text-[13px] gap-2">
                        <Workflow size={32} strokeWidth={1} className="opacity-30" />
                        <span>No workflows found</span>
                        <span className="text-[11px]">Connect n8n to get started</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {workflows.map(wf => (
                            <div key={wf.id} className="flex items-center gap-4 p-4 bg-bg-card border border-border rounded-xl hover:border-border-bright transition-colors group">
                                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-bg-hover border border-border shrink-0">
                                    <Workflow size={16} strokeWidth={1.5} className="text-text-secondary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[14px] text-text-primary font-medium truncate">{wf.name}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`font-mono text-[10px] uppercase tracking-wider ${wf.active ? 'text-positive' : 'text-text-muted'}`}>
                                            ● {wf.active ? 'Active' : 'Inactive'}
                                        </span>
                                        {wf.id && <span className="text-[10px] text-text-muted font-mono">#{wf.id}</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleTrigger(wf)}
                                    disabled={triggering === wf.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-hover border border-border text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors text-[12px] font-medium disabled:opacity-50">
                                    <Play size={12} strokeWidth={1.5} className={triggering === wf.id ? 'animate-pulse' : ''} />
                                    {triggering === wf.id ? 'Running…' : 'Trigger'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
