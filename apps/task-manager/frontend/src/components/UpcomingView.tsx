import React, { useState, useEffect } from 'react';
import {
  Circle,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';
import { Task } from '../types';
import { getTasks, toggleComplete, deleteTask } from '../api';

const upcomingDays = [
  { day: '12', label: 'MON', active: true },
  { day: '13', label: 'TUE' },
  { day: '14', label: 'WED' },
  { day: '15', label: 'THU' },
  { day: '16', label: 'FRI' },
  { day: '17', label: 'SAT' },
  { day: '18', label: 'SUN' },
];

export const UpcomingView = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedTasks, setGroupedTasks] = useState<Record<string, Task[]>>({});

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await getTasks('upcoming');
      setTasks(data.tasks);

      // Group tasks by date
      const grouped: Record<string, Task[]> = {};
      data.tasks.forEach(task => {
        if (task.due_date) {
          const date = new Date(task.due_date);
          const dateKey = date.toLocaleDateString(undefined, { weekday: 'long' });
          if (!grouped[dateKey]) {
            grouped[dateKey] = [];
          }
          grouped[dateKey].push(task);
        }
      });
      setGroupedTasks(grouped);
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

      // Update grouped tasks
      const newGrouped = { ...groupedTasks };
      Object.keys(newGrouped).forEach(key => {
        newGrouped[key] = newGrouped[key].map(t => t.id === id ? updated : t);
      });
      setGroupedTasks(newGrouped);
    } catch (err) {
      console.error('Error toggling completion:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));

      // Update grouped tasks
      const newGrouped = { ...groupedTasks };
      Object.keys(newGrouped).forEach(key => {
        newGrouped[key] = newGrouped[key].filter(t => t.id !== id);
      });
      setGroupedTasks(newGrouped);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-brand-surface p-8 pt-24">
      <div className="max-w-4xl px-8">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-brand-text tracking-tight">Upcoming</h1>
          </div>
          <button className="flex items-center gap-2 px-4 py-1.5 bg-brand-accent text-white text-sm font-bold rounded-lg shadow-lg shadow-brand-accent/20 hover:bg-brand-accent/90 transition-all">
            <Plus size={16} />
            <span>New Task</span>
          </button>
        </div>

        {/* Calendar Strip */}
        <div className="flex gap-4 mb-12 overflow-x-auto pb-2">
          {upcomingDays.map((day) => (
            <button
              key={day.day}
              className={`flex-1 min-w-[70px] flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                day.active
                  ? 'bg-brand-accent border-brand-accent text-white shadow-xl shadow-brand-accent/20 scale-105'
                  : 'bg-brand-card border-white/5 text-brand-muted hover:border-white/10'
              }`}
            >
              <span className={`text-lg font-black ${day.active ? 'text-white' : 'text-brand-text'}`}>{day.day}</span>
              <span className="text-[10px] font-bold tracking-widest">{day.label}</span>
            </button>
          ))}
        </div>

        {/* Task Groups by Date */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-brand-muted">Loading upcoming tasks...</p>
          </div>
        ) : Object.keys(groupedTasks).length === 0 ? (
          <div className="mb-10">
            <div className="flex items-baseline gap-3 mb-4 px-2">
              <h3 className="text-lg font-extrabold text-brand-text">No upcoming tasks</h3>
            </div>
            <div className="border-2 border-dashed border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-brand-muted mb-4">
                <CalendarIcon size={24} />
              </div>
              <p className="text-sm font-bold text-brand-muted mb-4">No tasks scheduled yet</p>
              <button className="text-brand-accent text-sm font-bold hover:underline">Add a task</button>
            </div>
          </div>
        ) : (
          Object.entries(groupedTasks).map(([date, tasks]) => (
            <div key={date} className="mb-10">
              <div className="flex items-baseline gap-3 mb-4 px-2">
                <h3 className="text-lg font-extrabold text-brand-text">{date}</h3>
                <span className="text-xs font-semibold text-brand-muted">
                  {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="bg-brand-card border border-white/5 rounded-2xl shadow-sm overflow-hidden">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => {}}
                    className="flex items-center gap-4 p-5 hover:bg-white/5 transition-all group border-b border-white/5 last:border-0 cursor-pointer"
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleComplete(task.id); }}
                      className="text-brand-muted hover:text-brand-accent transition-colors"
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
                      <h4 className={`text-sm font-bold ${task.completed ? 'text-brand-muted line-through' : 'text-brand-text'}`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1.5">
                        {task.due_date && (
                          <div className="flex items-center gap-1.5 text-brand-muted">
                            <CalendarIcon size={12} />
                            <span className="text-[10px] font-semibold">
                              {new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        {task.priority && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-brand-accent/20 text-brand-accent">
                            P{task.priority}
                          </span>
                        )}
                        {task.labels && task.labels.length > 0 && (
                          <div className="flex gap-1">
                            {task.labels.map((label, i) => (
                              <span key={i} className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider bg-brand-accent/20 text-brand-accent">
                                {label.replace('#', '')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                      className="text-brand-muted opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <MoreHorizontal size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Empty State for Wednesday */}
        {Object.keys(groupedTasks).length === 0 && (
          <div className="mb-10">
            <div className="flex items-baseline gap-3 mb-4 px-2">
              <h3 className="text-lg font-extrabold text-brand-text">Wednesday</h3>
              <span className="text-xs font-semibold text-brand-muted">May 14</span>
            </div>
            <div className="border-2 border-dashed border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-brand-muted mb-4">
                <CalendarIcon size={24} />
              </div>
              <p className="text-sm font-bold text-brand-muted mb-4">No tasks scheduled yet</p>
              <button className="text-brand-accent text-sm font-bold hover:underline">Add a task</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
