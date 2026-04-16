import React, { useEffect, useState } from 'react';
import { Plus, CheckSquare, Square, Trash2, PanelLeftOpen, Clock, Flag } from 'lucide-react';

const PRIORITY_COLORS = { low: 'text-positive', medium: 'text-yellow-400', high: 'text-error' };
const PRIORITY_DOT = { low: 'bg-positive', medium: 'bg-yellow-400', high: 'bg-error' };

export default function TasksPanel({ tasks, loading, loadTasks, addTask, toggleTask, removeTask, showToast, panelOpen, setPanelOpen }) {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });

    useEffect(() => { loadTasks(); }, [loadTasks]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        try {
            await addTask({ ...form, title: form.title.trim(), description: form.description.trim() });
            setForm({ title: '', description: '', priority: 'medium', dueDate: '' });
            setShowForm(false);
            showToast('Task created', 'success');
        } catch (err) {
            showToast(`Failed: ${err.message}`, 'error');
        }
    };

    const pending = tasks.filter(t => t.status !== 'completed');
    const completed = tasks.filter(t => t.status === 'completed');

    return (
        <div className="flex flex-col h-full bg-bg-main">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                    {!panelOpen && (
                        <button onClick={() => setPanelOpen(true)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-bg-hover text-text-muted transition-colors">
                            <PanelLeftOpen size={15} strokeWidth={1.5} />
                        </button>
                    )}
                    <h1 className="text-[16px] font-semibold text-text-primary">Tasks</h1>
                    <span className="font-mono text-[10px] text-text-muted bg-bg-card px-2 py-0.5 rounded-full border border-border">{pending.length} pending</span>
                </div>
                <button onClick={() => setShowForm(p => !p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-gradient text-[#003259] text-[13px] font-medium hover:opacity-90 transition-opacity">
                    <Plus size={14} strokeWidth={2} /> New Task
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* Create form */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-bg-card border border-border rounded-xl flex flex-col gap-3">
                        <input placeholder="Task title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-[14px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50" />
                        <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            rows={2}
                            className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 resize-none" />
                        <div className="flex gap-3">
                            <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                                className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent/50">
                                <option value="low">Low priority</option>
                                <option value="medium">Medium priority</option>
                                <option value="high">High priority</option>
                            </select>
                            <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                                className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent/50" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowForm(false)}
                                className="px-4 py-1.5 rounded-lg border border-border text-text-secondary text-[13px] hover:bg-bg-hover transition-colors">Cancel</button>
                            <button type="submit"
                                className="px-4 py-1.5 rounded-lg bg-accent-gradient text-[#003259] text-[13px] font-medium hover:opacity-90 transition-opacity">Create</button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-16 text-text-muted text-[13px]">Loading tasks…</div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-text-muted text-[13px] gap-2">
                        <CheckSquare size={32} strokeWidth={1} className="opacity-30" />
                        <span>No tasks yet</span>
                    </div>
                ) : (
                    <>
                        {pending.length > 0 && (
                            <div className="mb-6">
                                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-muted mb-3">Pending</div>
                                <div className="flex flex-col gap-2">
                                    {pending.map(task => <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={removeTask} showToast={showToast} />)}
                                </div>
                            </div>
                        )}
                        {completed.length > 0 && (
                            <div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-muted mb-3">Completed</div>
                                <div className="flex flex-col gap-2 opacity-60">
                                    {completed.map(task => <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={removeTask} showToast={showToast} />)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function TaskItem({ task, onToggle, onDelete, showToast }) {
    const done = task.status === 'completed';
    return (
        <div className="flex items-start gap-3 p-3 bg-bg-card border border-border rounded-xl hover:border-border-bright transition-colors group">
            <button onClick={() => onToggle(task.id, task.status)} className="mt-0.5 shrink-0 text-text-muted hover:text-accent transition-colors">
                {done ? <CheckSquare size={16} strokeWidth={1.5} className="text-accent" /> : <Square size={16} strokeWidth={1.5} />}
            </button>
            <div className="flex-1 min-w-0">
                <div className={`text-[14px] ${done ? 'line-through text-text-muted' : 'text-text-primary'}`}>{task.title}</div>
                {task.description && <div className="text-[12px] text-text-muted mt-0.5 truncate">{task.description}</div>}
                <div className="flex items-center gap-3 mt-1.5">
                    {task.priority && (
                        <span className={`flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider ${PRIORITY_COLORS[task.priority] || 'text-text-muted'}`}>
                            <div className={`w-1 h-1 rounded-full ${PRIORITY_DOT[task.priority] || 'bg-text-muted'}`} />
                            {task.priority}
                        </span>
                    )}
                    {task.dueDate && (
                        <span className="flex items-center gap-1 font-mono text-[10px] text-text-muted">
                            <Clock size={10} /> {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>
            <button onClick={() => onDelete(task.id)}
                className="shrink-0 text-text-muted hover:text-error transition-colors opacity-0 group-hover:opacity-100 mt-0.5">
                <Trash2 size={14} strokeWidth={1.5} />
            </button>
        </div>
    );
}
