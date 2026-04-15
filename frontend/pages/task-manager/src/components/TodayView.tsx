import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Calendar,
  AlertCircle,
  RefreshCw,
  Eye,
  Plus,
  Monitor,
  ChevronDown,
  Paperclip,
  Flag,
  Bell,
  Mic,
  Hash,
  Inbox,
  ChevronUp,
  X,
  Lock,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CalendarPlus,
  AudioLines
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../types';
import { getTasks, toggleComplete, deleteTask } from '../api';

export const TodayView = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await getTasks('today');
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

  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < Date.now() && !t.completed);
  const todayTasks = tasks.filter(t => !overdueTasks.includes(t));

  const formatDueDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (date.getTime() < today.getTime()) {
      return 'Overdue';
    } else if (date.getTime() === today.getTime()) {
      return 'Today';
    } else {
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-brand-surface p-8 pt-24">
      <div className="max-w-4xl px-8">
        {/* Top Right Actions */}
        <div className="absolute top-4 right-8 flex items-center gap-3 z-10">
          <div className="flex items-center bg-brand-card border border-white/10 rounded-lg p-0.5 shadow-sm">
            <button className="flex items-center gap-2 px-3 py-1.5 text-brand-text hover:bg-white/5 rounded-md transition-colors">
              <CalendarPlus size={16} className="text-brand-accent" />
              <span className="text-xs font-bold">Connect calendar</span>
            </button>
            <div className="w-px h-4 bg-white/10 mx-1"></div>
            <button className="p-1.5 text-brand-muted hover:text-brand-text rounded-md">
              <X size={14} />
            </button>
          </div>

          <button className="flex items-center gap-2 px-3 py-1.5 bg-brand-card border border-white/10 text-brand-text hover:bg-white/5 rounded-lg shadow-sm transition-colors">
            <Monitor size={16} className="text-brand-muted" />
            <span className="text-xs font-bold">Display</span>
          </button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-brand-text tracking-tight">Today</h1>
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle2 size={14} className="text-brand-muted" />
              <p className="text-brand-muted text-xs font-medium">
                {loading ? 'Loading...' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>

        {/* Overdue Section */}
        {overdueTasks.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2 cursor-pointer group">
                <ChevronDown size={16} className="text-brand-muted" />
                <h3 className="text-xs font-bold text-brand-text">Overdue</h3>
              </div>
              <button className="text-[10px] font-bold text-brand-accent hover:underline">Reschedule</button>
            </div>
            <div className="flex flex-col">
              {overdueTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="flex items-start gap-4 p-3 hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0 cursor-pointer"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleComplete(task.id); }}
                    className="mt-0.5 transition-colors"
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${task.completed
                        ? 'bg-brand-accent border-brand-accent'
                        : 'border-brand-accent stroke-[2.5px]'
                      }`}>
                      {task.completed && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-medium ${task.completed ? 'text-brand-muted line-through' : 'text-brand-text'}`}>{task.title}</h4>
                    </div>
                    {task.description && (
                      <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-brand-accent" />
                        <span className="text-[10px] font-bold text-brand-accent">Overdue</span>
                      </div>
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
                          <Flag size={10} className="text-brand-accent" />
                          <span className="text-[10px] font-bold text-brand-muted">P{task.priority}</span>
                        </div>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        <span className="text-[10px] font-medium text-brand-muted">Inbox</span>
                        <Inbox size={10} className="text-brand-muted" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today Section */}
        {todayTasks.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-bold text-brand-text">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
            </div>
            <div className="flex flex-col">
              {todayTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="flex items-start gap-4 p-3 hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0 cursor-pointer"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleComplete(task.id); }}
                    className="mt-0.5 transition-colors"
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${task.completed
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
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-medium ${task.completed ? 'text-brand-muted line-through' : 'text-brand-text'}`}>{task.title}</h4>
                    </div>
                    {task.description && (
                      <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className={task.due_date && task.due_date < Date.now() ? "text-brand-accent" : "text-brand-muted"} />
                        <span className={`text-[10px] font-bold ${task.due_date && task.due_date < Date.now() ? "text-brand-accent" : "text-brand-muted"}`}>
                          {new Date(task.due_date || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
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
                          <Flag size={10} className={task.priority <= 2 ? "text-brand-accent" : "text-brand-muted"} />
                          <span className="text-[10px] font-bold text-brand-muted">P{task.priority}</span>
                        </div>
                      )}
                      {task.project_id && (
                        <div className="flex items-center gap-1">
                          <Inbox size={10} className="text-brand-muted" />
                          <span className="text-[10px] font-medium text-brand-muted">{task.project_id}</span>
                        </div>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        <span className="text-[10px] font-medium text-brand-muted">Inbox</span>
                        <Inbox size={10} className="text-brand-muted" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {tasks.length === 0 && !loading && (
          <div className="border-2 border-dashed border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-brand-muted mb-4">
              <Calendar size={24} />
            </div>
            <p className="text-sm font-bold text-brand-muted mb-4">No tasks scheduled for today</p>
            <button
              onClick={() => setIsAddingTask(true)}
              className="text-brand-accent text-sm font-bold hover:underline"
            >
              Add a task
            </button>
          </div>
        )}

        {/* Add Task Button or Inline Form */}
        {!isAddingTask ? (
          <button
            onClick={() => setIsAddingTask(true)}
            className="flex items-center gap-2 px-2 py-2 text-brand-muted hover:text-brand-accent transition-colors group w-full text-left"
          >
            <Plus size={18} className="text-brand-accent group-hover:bg-brand-accent group-hover:text-white rounded-full transition-all" />
            <span className="text-sm font-medium">Add task</span>
          </button>
        ) : (
          <AddTaskInline onCancel={() => setIsAddingTask(false)} />
        )}

        <AnimatePresence>
          {selectedTask && (
            <TaskDetailModal
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Inline task adder component (kept from original for UI continuity)
const AddTaskInline: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
  return (
    <div className="mt-2 border border-white/10 rounded-xl overflow-hidden shadow-sm">
      <div className="p-3 bg-brand-card">
        <input
          type="text"
          placeholder="Check notes before meeting Friday p2"
          className="w-full text-sm font-bold text-brand-text placeholder-white/20 bg-transparent focus:outline-none mb-1"
          autoFocus
        />
        <textarea
          placeholder="Description"
          className="w-full text-xs text-brand-muted placeholder-white/20 bg-transparent focus:outline-none resize-none h-8"
        />

        <div className="flex flex-wrap items-center gap-2 mt-2">
          <button className="flex items-center gap-1.5 px-2 py-1 border border-white/10 rounded-lg text-xs font-bold text-brand-green hover:bg-white/5">
            <Calendar size={14} />
            <span>Today</span>
            <X size={12} className="text-brand-muted" />
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1 border border-white/10 rounded-lg text-xs font-bold text-brand-muted hover:bg-white/5">
            <Paperclip size={14} />
            <span>Attachment</span>
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1 border border-white/10 rounded-lg text-xs font-bold text-brand-muted hover:bg-white/5">
            <Flag size={14} />
            <span>Priority</span>
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1 border border-white/10 rounded-lg text-xs font-bold text-brand-muted hover:bg-white/5">
            <Bell size={14} />
            <span>Reminders</span>
          </button>
          <button className="p-1 border border-white/10 rounded-lg text-brand-muted hover:bg-white/5">
            <MoreHorizontal size={14} />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-bold text-brand-green uppercase tracking-wider">DICTATE</span>
            <div className="w-6 h-6 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent">
              <AudioLines size={14} />
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 bg-brand-bg border-t border-white/5 flex items-center justify-between">
        <button className="flex items-center gap-1 text-xs font-bold text-brand-muted hover:bg-white/5 px-2 py-1 rounded">
          <Inbox size={14} />
          <span>Inbox</span>
          <ChevronDown size={12} />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-bold text-brand-text bg-brand-card border border-white/10 rounded-lg hover:bg-white/5"
          >
            Cancel
          </button>
          <button className="px-3 py-1.5 text-xs font-bold text-white bg-brand-accent opacity-50 rounded-lg cursor-not-allowed">Add task</button>
        </div>
      </div>
    </div>
  );
};

const TaskDetailModal: React.FC<{ task: Task; onClose: () => void }> = ({ task, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-brand-card rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-2 text-brand-muted">
            <Inbox size={16} />
            <span className="text-xs font-medium">Inbox</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 text-brand-muted hover:text-brand-text hover:bg-white/5 rounded-lg">
              <ChevronUp size={18} />
            </button>
            <button className="p-1.5 text-brand-muted hover:text-brand-text hover:bg-white/5 rounded-lg">
              <ChevronDown size={18} />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button className="p-1.5 text-brand-muted hover:text-brand-text hover:bg-white/5 rounded-lg">
              <MoreHorizontal size={18} />
            </button>
            <button onClick={onClose} className="p-1.5 text-brand-muted hover:text-brand-text hover:bg-white/5 rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Side - Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="flex items-start gap-4">
              <button className="mt-1.5 text-brand-accent">
                <Circle size={24} className="stroke-[2.5px]" />
              </button>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-brand-text mb-2">{task.title}</h2>
                <div className="flex items-center gap-2 text-brand-muted mb-8 cursor-pointer hover:text-brand-text">
                  <Plus size={16} />
                  <span className="text-sm">Description</span>
                </div>

                <button className="flex items-center gap-2 text-brand-muted hover:text-brand-accent transition-colors mb-8">
                  <Plus size={16} />
                  <span className="text-sm font-medium">Add sub-task</span>
                </button>

                <div className="mt-8 border-t border-white/5 pt-8">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center overflow-hidden border border-white/10">
                      <img
                        src="/api/images/2026-03-07T16:38:12-08:00.png"
                        alt="Profile"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Comment"
                        className="w-full px-4 py-2 bg-brand-bg border border-white/10 rounded-full text-sm text-brand-text focus:outline-none focus:border-white/20"
                      />
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text">
                        <Paperclip size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Metadata */}
          <div className="w-72 bg-brand-bg border-l border-white/5 p-4 flex flex-col gap-6">
            <div>
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-2">Project</label>
              <button className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-lg transition-colors group">
                <div className="flex items-center gap-2">
                  <Inbox size={16} className="text-brand-muted" />
                  <span className="text-sm text-brand-text">{task.project_id || 'Inbox'}</span>
                </div>
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-2">Date</label>
              <button className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-lg transition-colors group">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className={task.due_date && task.due_date < Date.now() ? "text-brand-accent" : "text-brand-green"} />
                  <span className="text-sm text-brand-text">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}
                  </span>
                </div>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider flex items-center gap-1">
                  Deadline <Flag size={10} className={task.priority && task.priority <= 2 ? "text-brand-accent" : "text-brand-muted"} />
                </label>
                <Lock size={12} className="text-brand-muted" />
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-2">Priority</label>
              <button className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-lg transition-colors group">
                <div className="flex items-center gap-2">
                  <Flag size={16} className={task.priority === 1 ? "text-brand-accent fill-brand-accent" : "text-brand-muted"} />
                  <span className="text-sm text-brand-text">P{task.priority || 3}</span>
                </div>
              </button>
            </div>

            <div className="border-t border-white/5 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Labels</label>
                <button className="p-1 text-brand-muted hover:text-brand-text">
                  <Plus size={14} />
                </button>
              </div>
              {task.labels && task.labels.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {task.labels.map((label, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-1 rounded-full bg-brand-accent/10 text-brand-accent">
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Reminders</label>
                <button className="p-1 text-brand-muted hover:text-brand-text">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider flex items-center gap-1">
                  Location <Flag size={10} className="text-brand-accent" />
                </label>
                <Lock size={12} className="text-brand-muted" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
