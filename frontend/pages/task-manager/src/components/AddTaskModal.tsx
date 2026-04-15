import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  Paperclip,
  Flag,
  Bell,
  MoreHorizontal,
  Inbox,
  ChevronDown,
  AudioLines,
  Check,
  Plus
} from 'lucide-react';
import { parseNaturalLanguage, ParsedTask } from '../parser';
import { createTask, getLabels, createLabel, getProjects, Task } from '../api';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskAdded?: () => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onTaskAdded }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState<number>(3);
  const [labels, setLabels] = useState<{ id: number; name: string; color: string }[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedProjectName, setSelectedProjectName] = useState<string>('Inbox');
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [loading, setLoading] = useState(false);

  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadLabels();
      loadProjects();
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority(3);
      setSelectedLabels([]);
      setSelectedProject('');
      setParsedTask(null);
    }
  }, [isOpen]);

  const loadLabels = async () => {
    try {
      const data = await getLabels();
      setLabels(data);
    } catch (err) {
      console.error('Error loading labels:', err);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);

      // Set default project if available
      if (data.length > 0) {
        setSelectedProject(data[0].id);
        setSelectedProjectName(data[0].name);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTitle(value);

    // Parse natural language as user types
    if (value.length > 0) {
      const parsed = parseNaturalLanguage(value);
      setParsedTask(parsed);
      setTitle(parsed.title);

      // Update due date if parsed
      if (parsed.due_date) {
        const date = new Date(parsed.due_date);
        const YYYY = date.getFullYear();
        const MM = String(date.getMonth() + 1).padStart(2, '0');
        const DD = String(date.getDate()).padStart(2, '0');
        setDueDate(`${YYYY}-${MM}-${DD}`);
      }

      // Update priority if parsed
      if (parsed.priority) {
        setPriority(parsed.priority);
      }

      // Auto-select labels from parsed result
      if (parsed.labels && parsed.labels.length > 0) {
        setSelectedLabels(prev => {
          const newLabels = [...prev];
          parsed.labels?.forEach(label => {
            if (!newLabels.includes(label)) {
              newLabels.push(label);
            }
          });
          return newLabels;
        });
      }

      // Update project if parsed
      if (parsed.project) {
        const project = projects.find(p => p.name.toLowerCase() === parsed.project?.toLowerCase() || p.id === parsed.project);
        if (project) {
          setSelectedProject(project.id);
          setSelectedProjectName(project.name);
        }
      }
    } else {
      setParsedTask(null);
    }
  };

  const handleAddLabel = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && labelInputRef.current) {
      e.preventDefault();
      const labelName = labelInputRef.current.value.trim();
      if (labelName && !selectedLabels.includes(`#${labelName}`)) {
        const newLabel = `#${labelName}`;
        setSelectedLabels(prev => [...prev, newLabel]);

        // Check if label exists in backend, create if not
        const existingLabel = labels.find(l => l.name.toLowerCase() === labelName.toLowerCase());
        if (!existingLabel) {
          try {
            await createLabel(labelName, '#5e7dff');
            await loadLabels();
          } catch (err) {
            console.error('Error creating label:', err);
          }
        }
      }
      labelInputRef.current.value = '';
    }
  };

  const removeLabel = (label: string) => {
    setSelectedLabels(prev => prev.filter(l => l !== label));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);

    try {
      const dueDateValue = dueDate ? new Date(dueDate).getTime() : undefined;

      const taskData: Partial<Task> = {
        title: parsedTask?.title || title,
        description: description || undefined,
        due_date: dueDateValue,
        priority: priority || 3,
        labels: selectedLabels,
        project_id: selectedProject || undefined,
        created_at: Date.now(),
        updated_at: Date.now(),
        completed: false,
      };

      await createTask(taskData);

      // Reset form
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority(3);
      setSelectedLabels([]);
      setParsedTask(null);

      if (onTaskAdded) {
        onTaskAdded();
      }

      onClose();
    } catch (err) {
      console.error('Error creating task:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        className="relative w-full max-w-2xl bg-brand-card rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col"
      >
        <div className="p-4 bg-brand-card">
          <input
            type="text"
            placeholder="Check notes before meeting Friday p2"
            className="w-full text-lg font-bold text-brand-text placeholder-white/20 bg-transparent focus:outline-none mb-1"
            autoFocus
            value={title}
            onChange={handleInputChange}
          />
          <textarea
            placeholder="Description"
            className="w-full text-sm text-brand-muted placeholder-white/20 bg-transparent focus:outline-none resize-none h-12"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Parsed info display */}
          {parsedTask && (title !== parsedTask.title || parsedTask.due_date || parsedTask.priority || parsedTask.labels.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 mt-2 mb-4">
              {parsedTask.priority && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-brand-accent/20 text-brand-accent">
                  <Flag size={10} />
                  P{parsedTask.priority}
                </span>
              )}
              {parsedTask.due_date && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-brand-green/20 text-brand-green">
                  <Calendar size={10} />
                  {formatDate(parsedTask.due_date)}
                </span>
              )}
              {parsedTask.labels.length > 0 && (
                <div className="flex gap-1">
                  {parsedTask.labels.map((label, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-1 rounded-full bg-brand-accent/20 text-brand-accent">
                      {label}
                    </span>
                  ))}
                </div>
              )}
              {parsedTask.project && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-brand-muted/20 text-brand-muted">
                  {parsedTask.project}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const YYYY = today.getFullYear();
                const MM = String(today.getMonth() + 1).padStart(2, '0');
                const DD = String(today.getDate()).padStart(2, '0');
                setDueDate(`${YYYY}-${MM}-${DD}`);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded-lg text-xs font-bold text-brand-green hover:bg-white/5 transition-colors"
            >
              <Calendar size={14} />
              <span>Today</span>
              {dueDate && (
                <>
                  <X size={12} className="text-brand-muted ml-1" />
                  <span className="text-xs">{dueDate.split('-').slice(1).join('/')}</span>
                </>
              )}
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded-lg text-xs font-bold text-brand-muted hover:bg-white/5 transition-colors">
              <Paperclip size={14} />
              <span>Attachment</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded-lg text-xs font-bold text-brand-muted hover:bg-white/5 transition-colors">
              <Flag size={14} />
              <span>Priority</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded-lg text-xs font-bold text-brand-muted hover:bg-white/5 transition-colors">
              <Bell size={14} />
              <span>Reminders</span>
            </button>
            <button className="p-2 border border-white/10 rounded-lg text-brand-muted hover:bg-white/5 transition-colors">
              <MoreHorizontal size={14} />
            </button>

            <div className="ml-auto flex items-center gap-2">
              {/* Labels input */}
              <div className="relative">
                <input
                  ref={labelInputRef}
                  type="text"
                  placeholder="#label"
                  className="w-24 text-xs font-bold text-brand-muted placeholder-white/20 bg-transparent focus:outline-none"
                  onKeyDown={handleAddLabel}
                />
                <div className="flex gap-1 mt-2">
                  {selectedLabels.map((label, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent">
                      {label}
                      <button
                        onClick={() => removeLabel(label)}
                        className="hover:text-brand-text"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowLabelMenu(!showLabelMenu)}
                  className="p-2 border border-white/10 rounded-lg text-brand-muted hover:bg-white/5"
                >
                  <Plus size={14} />
                </button>
              </div>

              <span className="text-[10px] font-bold text-brand-green uppercase tracking-wider">DICTATE</span>
              <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                <AudioLines size={16} />
              </div>
            </div>
          </div>

          {/* Priority selector */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Priority:</span>
            {[1, 2, 3, 4].map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${priority === p
                  ? 'bg-brand-accent text-white'
                  : 'bg-brand-card border border-white/10 text-brand-muted hover:border-brand-accent'
                  }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Project selector */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Project:</span>
            <div className="relative">
              <button
                onClick={() => setShowProjectMenu(!showProjectMenu)}
                className="flex items-center gap-1 px-2 py-1 border border-white/10 rounded-lg text-xs font-bold text-brand-muted hover:bg-white/5"
              >
                <Inbox size={12} />
                <span>{selectedProjectName}</span>
                <ChevronDown size={12} />
              </button>
              {showProjectMenu && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-brand-card border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden">
                  <div
                    onClick={() => {
                      setSelectedProject('');
                      setSelectedProjectName('Inbox');
                      setShowProjectMenu(false);
                    }}
                    className="px-3 py-2 text-sm text-brand-text hover:bg-white/5 cursor-pointer flex items-center gap-2"
                  >
                    <Inbox size={14} />
                    Inbox
                  </div>
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project.id);
                        setSelectedProjectName(project.name);
                        setShowProjectMenu(false);
                      }}
                      className="px-3 py-2 text-sm text-brand-text hover:bg-white/5 cursor-pointer flex items-center gap-2"
                    >
                      <span className="text-lg">{project.emoji || '📁'}</span>
                      {project.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-brand-bg border-t border-white/5 flex items-center justify-between">
          <button className="flex items-center gap-1.5 text-sm font-bold text-brand-muted hover:bg-white/5 px-3 py-1.5 rounded-lg transition-colors">
            <Inbox size={16} />
            <span>{selectedProjectName}</span>
            <ChevronDown size={14} />
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-brand-text bg-brand-card border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !title.trim()}
              className="px-4 py-2 text-sm font-bold text-white bg-brand-accent rounded-xl shadow-lg shadow-brand-accent/20 hover:bg-brand-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
