import React, { useEffect, useState } from 'react';
import { getN8nWorkflows, getConnectedWorkflows, connectWorkflow, disconnectWorkflow, triggerWorkflow } from '../utils/api';
import { Link as LinkIcon, Play, Unplug, Plug, Menu } from 'lucide-react';

export default function ConnectorsDetailView({ showToast, panelOpen, setPanelOpen }) {
  const [workflows, setWorkflows] = useState([]);
  const [connected, setConnected] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [all, conn] = await Promise.all([
        getN8nWorkflows(),
        getConnectedWorkflows()
      ]);

      // Handle the case where the backend returns `{ error: "..." }` with 200 OK
      if (all && all.error) {
        showToast(all.error, 'error');
        setWorkflows([]);
      } else {
        setWorkflows(Array.isArray(all) ? all : []);
      }

      if (conn && conn.error) {
        setConnected([]);
      } else {
        setConnected(Array.isArray(conn) ? conn : []);
      }

    } catch (error) {
      showToast('Failed to load workflows', 'error');
      setWorkflows([]);
      setConnected([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (workflowId) => {
    try {
      await connectWorkflow({ workflowId });
      showToast('Workflow connected', 'success');
      loadData();
    } catch (error) {
      showToast('Failed to connect workflow', 'error');
    }
  };

  const handleDisconnect = async (workflowId) => {
    try {
      await disconnectWorkflow(workflowId);
      showToast('Workflow disconnected', 'success');
      loadData();
    } catch (error) {
      showToast('Failed to disconnect workflow', 'error');
    }
  };

  const handleTrigger = async (workflowId) => {
    try {
      await triggerWorkflow(workflowId);
      showToast('Workflow triggered successfully', 'success');
    } catch (error) {
      showToast('Failed to trigger workflow', 'error');
    }
  };

  const isConnected = (id) => connected.some(c => c.workflowId === id);

  return (
    <div className="flex flex-col h-full w-full bg-bg-main overflow-y-auto relative">
      <div className="max-w-[800px] mx-auto w-full pt-[60px] px-6 pb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-[40px] h-[40px] rounded-[10px] bg-bg-card flex items-center justify-center shrink-0 border border-border">
            <LinkIcon size={20} className="text-positive" />
          </div>
          <h1 className="text-[24px] font-medium text-text-primary">Connectors</h1>
        </div>
        <p className="text-[14px] text-text-secondary mb-8">
          Manage n8n workflows and external integrations.
        </p>

        {loading ? (
          <div className="text-center py-8 text-text-muted font-mono text-[12px] uppercase tracking-wider animate-pulse">Loading workflows...</div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-12 bg-bg-card rounded-[12px] border border-border text-text-muted text-[14px]">
            No n8n workflows found. Ensure your n8n instance is running and accessible.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workflows.map(wf => {
              const connectedState = isConnected(wf.id);
              return (
                <div key={wf.id} className="bg-bg-card border border-border rounded-[12px] p-5 flex flex-col h-full hover:border-accent transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold text-text-primary text-[15px]">{wf.name}</h3>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${connectedState ? 'bg-positive' : 'bg-text-muted'}`}></span>
                          <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                            {connectedState ? 'Connected' : 'Available'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[13px] text-text-secondary flex-1 mb-6">
                    {wf.description || 'No description provided for this workflow.'}
                  </p>

                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border">
                    {connectedState ? (
                      <>
                        <button
                          onClick={() => handleDisconnect(wf.id)}
                          className="flex-1 py-2 rounded-[8px] bg-bg-input text-error hover:bg-error/10 border border-border hover:border-error/30 transition-colors font-medium text-[13px] flex items-center justify-center gap-2"
                        >
                          <Unplug size={14} />
                          Disconnect
                        </button>
                        <button
                          onClick={() => handleTrigger(wf.id)}
                          className="flex-1 py-2 rounded-[8px] bg-accent text-bg-main hover:opacity-90 transition-opacity font-medium text-[13px] flex items-center justify-center gap-2"
                        >
                          <Play size={14} />
                          Trigger
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnect(wf.id)}
                        className="w-full py-2 rounded-[8px] bg-bg-input text-text-primary hover:bg-bg-hover border border-border transition-colors font-medium text-[13px] flex items-center justify-center gap-2"
                      >
                        <Plug size={14} />
                        Connect Workflow
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
