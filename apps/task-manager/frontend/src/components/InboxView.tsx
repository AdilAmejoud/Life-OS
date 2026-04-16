import React, { useState, useEffect } from 'react';
import { Plus, Inbox } from 'lucide-react';
import { motion } from 'motion/react';
import { Task } from '../types';
import { getTasks, toggleComplete, deleteTask } from '../api';

export const InboxView: React.FC<{ onAddTask: () => void }> = ({ onAddTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await getTasks('inbox');
      setTasks(data.tasks);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (id: string) => {
    try {
      const updated = await toggleComplete(id);
      setTasks(tasks.map(t => t.id === id ? updated : t));
    } catch (err) {
      console.error('Error toggling completion:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start pt-24 p-8 bg-brand-surface overflow-y-auto">
      <h1 className="text-2xl font-bold text-brand-text mb-2 w-full max-w-4xl px-8">Inbox</h1>

      {loading ? (
        <div className="flex items-center justify-center h-64 w-full">
          <p className="text-brand-muted">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center max-w-md"
        >
          <div className="relative mb-8">
            <div className="w-64 h-48 flex items-center justify-center">
              <svg viewBox="0 0 200 150" className="w-full h-full">
                {/* Background Cloud/Shape */}
                <path d="M40,80 Q40,40 80,40 T120,40 Q160,40 160,80 T120,120 Q80,120 40,80" fill="var(--color-brand-accent)" opacity="0.1" />

                {/* Cold Blue Tray */}
                <path d="M50,80 L150,80 L140,130 L60,130 Z" fill="var(--color-brand-accent)" opacity="0.8" />
                <path d="M50,80 L150,80 L150,90 Q150,100 140,100 L60,100 Q50,100 50,90 Z" fill="var(--color-brand-accent)" opacity="0.4" />
                <path d="M80,100 L120,100 L115,110 L85,110 Z" fill="var(--color-brand-accent)" opacity="0.6" />

                {/* Sparkles - Cyan */}
                <path d="M30,70 L35,65 M30,65 L35,70" stroke="#00FFFF" strokeWidth="2" />
                <path d="M170,90 L175,85 M170,85 L175,90" stroke="#00FFFF" strokeWidth="2" />

                {/* Cold Blue/Cyan Shapes */}
                <path d="M160,50 Q170,70 160,100" stroke="var(--color-brand-accent)" strokeWidth="8" strokeLinecap="round" opacity="0.3" />
                <path d="M40,100 Q30,110 40,130" stroke="var(--color-brand-accent)" strokeWidth="6" strokeLinecap="round" opacity="0.2" />
              </svg>
            </div>
          </div>

          <h2 className="text-base font-bold text-brand-text mb-2">Capture now, plan later</h2>
          <p className="text-brand-muted text-sm leading-relaxed mb-8">
            Inbox is your go-to spot for quick task <br />
            entry. Clear your mind now, organize <br />
            when you're ready.
          </p>

          <button
            onClick={onAddTask}
            className="flex items-center gap-2 px-6 py-2 bg-brand-accent text-white font-bold rounded-lg shadow-lg shadow-brand-accent/20 hover:bg-brand-accent/90 transition-all"
          >
            <Plus size={18} strokeWidth={3} />
            <span>Add task</span>
          </button>
        </motion.div>
      ) : (
        <div className="w-full max-w-4xl px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-brand-text">{tasks.length} pending task{tasks.length !== 1 && 's'}</h2>
            <button
              onClick={() => { onAddTask(); }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white text-sm font-bold rounded-lg hover:bg-brand-accent/90 transition-colors"
            >
              <Plus size={16} />
              <span>Add Task</span>
            </button>
          </div>

          <div className="flex flex-col">
            {tasks.map(task => (
              <div
                key={task.id}
                className="flex items-start gap-4 p-4 hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0"
              >
                <button
                  onClick={() => handleToggleComplete(task.id)}
                  className="mt-1 transition-colors"
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                    task.completed
                      ? 'bg-brand-accent border-brand-accent'
                      : 'border-brand-muted hover:border-brand-accent'
                  }`}>
                    {task.completed && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${task.completed ? 'text-brand-muted line-through' : 'text-brand-text'}`}>
                    {task.title}
                  </div>
                  {task.description && (
                    <p className="text-xs text-brand-muted mt-0.5">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {task.labels && task.labels.length > 0 && (
                      <div className="flex gap-1">
                        {task.labels.map((label, i) => (
                          <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                    {task.priority && (
                      <div className="flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke={task.priority <= 2 ? 'var(--color-brand-accent)' : 'var(--color-brand-muted)'} strokeWidth="2" className="w-3 h-3">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span className="text-[10px] font-bold text-brand-muted">P{task.priority}</span>
                      </div>
                    )}
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-muted)" strokeWidth="2" className="w-3 h-3">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span className="text-[10px] font-bold text-brand-muted">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {task.project_id && (
                      <div className="flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-muted)" strokeWidth="2" className="w-3 h-3">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="text-[10px] font-bold text-brand-muted">{task.project_id}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-brand-muted hover:text-brand-accent transition-opacity"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
