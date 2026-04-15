import React, { useEffect, useState } from 'react';
import { usePomodoro } from './state';
import type { TaskStatus, Subtask } from './types';

const SUGGESTED_TAGS = ['phone', 'green', 'groceries', 'urgent', 'focused', 'work'];
const POMODORO_QUICK = [50, 30, 15];
const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'doing', label: 'Doing' },
  { value: 'later', label: 'Later' },
  { value: 'done', label: 'Done' }
];

interface TaskDetailPanelProps {
  taskId: string | null;
  isNew: boolean;
  onClose: () => void;
  defaultListId?: string;
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  taskId,
  isNew,
  onClose,
  defaultListId = 'personal'
}) => {
  const {
    tasks,
    lists,
    contexts,
    addTask,
    updateTask,
    deleteTask,
    addReminder,
    addAttachment,
    removeAttachment,
    setSelectedTaskId
  } = usePomodoro();

  const task = taskId ? tasks.find(t => t.id === taskId) : null;
  const [title, setTitle] = useState('');
  const [about, setAbout] = useState('');
  const [description, setDescription] = useState('');
  const [markdownNotes, setMarkdownNotes] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(1);
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [listId, setListId] = useState(defaultListId);
  const [contextIds, setContextIds] = useState<string[]>([]);
  const [blockedBy, setBlockedBy] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setAbout(task.about ?? '');
      setDescription(task.description ?? '');
      setMarkdownNotes(task.markdownNotes ?? false);
      setStartDate(task.startDate ?? '');
      setStartTime(task.startTime ?? '');
      setDueDate(task.dueDate ?? '');
      setDueTime(task.dueTime ?? '');
      setEstimatedPomodoros(task.estimatedPomodoros);
      setStatus(task.status);
      setListId(task.listId);
      setContextIds(task.contexts ?? []);
      setBlockedBy(task.blockedBy ?? []);
      setTags(task.tags ?? []);
      setOverdue(task.overdue ?? false);
      setSubtasks(task.subtasks ?? []);
    } else if (isNew) {
      setTitle('');
      setAbout('');
      setDescription('');
      setMarkdownNotes(false);
      setStartDate('');
      setStartTime('');
      setDueDate('');
      setDueTime('');
      setEstimatedPomodoros(1);
      setStatus('todo');
      setListId(defaultListId);
      setContextIds([]);
      setBlockedBy([]);
      setTags([]);
      setOverdue(false);
      setSubtasks([]);
    }
  }, [task, isNew, defaultListId]);

  const handleSave = () => {
    if (!title.trim()) return;
    if (task) {
      updateTask(task.id, {
        title: title.trim(),
        about: about.trim() || undefined,
        description: description.trim() || undefined,
        markdownNotes,
        startDate: startDate || null,
        startTime: startTime || null,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        estimatedPomodoros,
        status,
        listId,
        contexts: contextIds,
        blockedBy,
        tags,
        overdue,
        subtasks
      });
      setSelectedTaskId(null);
      onClose();
    } else {
      addTask({
        title: title.trim(),
        about: about.trim() || undefined,
        description: description.trim() || undefined,
        markdownNotes,
        startDate: startDate || null,
        startTime: startTime || null,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        estimatedPomodoros,
        status,
        listId,
        contexts: contextIds,
        blockedBy,
        tags,
        overdue,
        subtasks
      });
      onClose();
    }
  };

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const handleSuggestedTag = (tag: string) => {
    if (!tags.includes(tag)) setTags([...tags, tag]);
  };

  const handleRemoveTag = (tag: string) => setTags(tags.filter(x => x !== tag));

  const handleAddSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    setSubtasks([
      ...subtasks,
      { id: String(Date.now()), title, done: false }
    ]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(subtasks.map(s => (s.id === id ? { ...s, done: !s.done } : s)));
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const handleAddReminder = () => {
    const at = Date.now() + 60 * 60 * 1000;
    if (task) addReminder(task.id, at);
  };

  const handleAddFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file || !task) return;
      const url = URL.createObjectURL(file);
      addAttachment(task.id, { id: String(Date.now()), type: 'file', name: file.name, url });
    };
    input.click();
  };

  const handleAddLink = () => {
    const url = window.prompt('Link URL');
    const name = window.prompt('Link name', url || '');
    if (url && task) addAttachment(task.id, { id: String(Date.now()), type: 'link', name: name || url, url });
  };

  if (!task && !isNew) return null;

  const attachments = task?.attachments ?? [];

  return (
    <div className="task-detail-panel">
      <div className="task-detail-scroll">
        <div className="task-detail-field">
          <label className="task-detail-label">Title</label>
          <input
            type="text"
            className="task-detail-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task title"
          />
        </div>
        <div className="task-detail-field">
          <label className="task-detail-label">About</label>
          <input
            type="text"
            className="task-detail-input"
            value={about}
            onChange={e => setAbout(e.target.value)}
            placeholder="Always remember..."
          />
        </div>
        <div className="task-detail-field">
          <label className="task-detail-label">Suggested tags</label>
          <div className="task-detail-tag-suggestions">
            {SUGGESTED_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                className="task-detail-tag-pill"
                onClick={() => handleSuggestedTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div className="task-detail-field">
          <label className="task-detail-label">Description</label>
          <textarea
            className="task-detail-textarea"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
          />
          <label className="task-detail-check">
            <input type="checkbox" checked={markdownNotes} onChange={e => setMarkdownNotes(e.target.checked)} />
            Markdown notes
          </label>
        </div>
        <div className="task-detail-field">
          <label className="task-detail-label">Attachments</label>
          <div className="task-detail-attachments">
            {task && (
              <>
                <button type="button" className="btn-secondary task-detail-btn-sm" onClick={handleAddFile}>
                  Add File
                </button>
                <button type="button" className="btn-secondary task-detail-btn-sm" onClick={handleAddLink}>
                  Add Link
                </button>
              </>
            )}
            {attachments.map(a => (
              <div key={a.id} className="task-detail-attachment-item">
                <a href={a.url || '#'} target="_blank" rel="noopener noreferrer">
                  {a.name}
                </a>
                {task && (
                  <button
                    type="button"
                    className="task-detail-remove"
                    onClick={() => removeAttachment(task.id, a.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="task-detail-row">
          <div className="task-detail-field">
            <label className="task-detail-label">Start Date</label>
            <input
              type="date"
              className="task-detail-input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <input
              type="time"
              className="task-detail-input task-detail-time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
          </div>
          <div className="task-detail-field">
            <label className="task-detail-label">Due Date</label>
            <input
              type="date"
              className="task-detail-input"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            <input
              type="time"
              className="task-detail-input task-detail-time"
              value={dueTime}
              onChange={e => setDueTime(e.target.value)}
            />
          </div>
        </div>
        <div className="task-detail-field">
          <label className="task-detail-label">Pomodoro</label>
          <div className="task-detail-pomodoro">
            <input
              type="number"
              className="task-detail-input task-detail-input-sm"
              min={1}
              value={estimatedPomodoros}
              onChange={e => setEstimatedPomodoros(Number(e.target.value) || 1)}
            />
            {POMODORO_QUICK.map(m => (
              <button
                key={m}
                type="button"
                className={`task-detail-pill${estimatedPomodoros === m ? ' active' : ''}`}
                onClick={() => setEstimatedPomodoros(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="task-detail-row">
          <div className="task-detail-field">
            <label className="task-detail-label">Status</label>
            <select
              className="task-detail-select"
              value={status}
              onChange={e => setStatus(e.target.value as TaskStatus)}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="task-detail-field">
            <label className="task-detail-label">Projects</label>
            <select className="task-detail-select" value={listId} onChange={e => setListId(e.target.value)}>
              {lists.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="task-detail-field">
          <label className="task-detail-label">Blocked by</label>
          <select
            className="task-detail-select"
            multiple
            value={blockedBy}
            onChange={e => {
              const opts = Array.from((e.target as HTMLSelectElement).selectedOptions, o => o.value);
              setBlockedBy(opts);
            }}
          >
            {tasks.filter(t => t.id !== task?.id).map(t => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
        <div className="task-detail-field">
          <label className="task-detail-label">Contexts</label>
          <select
            className="task-detail-select"
            multiple
            value={contextIds}
            onChange={e => {
              const opts = Array.from((e.target as HTMLSelectElement).selectedOptions, o => o.value);
              setContextIds(opts);
            }}
          >
            {contexts.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {task && (
          <div className="task-detail-field">
            <button type="button" className="btn-secondary task-detail-btn-sm" onClick={handleAddReminder}>
              Add Reminder
            </button>
          </div>
        )}
        <div className="task-detail-field">
          <label className="task-detail-label">Tags</label>
          <div className="task-detail-tags-row">
            <input
              type="text"
              className="task-detail-input"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="Add tag"
            />
            <button type="button" className="btn-secondary task-detail-btn-sm" onClick={handleAddTag}>
              Add Tag
            </button>
          </div>
          <div className="task-detail-tags-list">
            {tags.map(tag => (
              <span key={tag} className="task-tag task-detail-tag">
                {tag}
                <button type="button" className="task-detail-tag-remove" onClick={() => handleRemoveTag(tag)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="task-detail-field">
          <label className="task-detail-check">
            <input type="checkbox" checked={overdue} onChange={e => setOverdue(e.target.checked)} />
            Overdue
          </label>
        </div>
        <div className="task-detail-field">
          <label className="task-detail-label">Sub-tasks</label>
          <div className="task-detail-subtasks">
            {subtasks.map(s => (
              <div key={s.id} className="task-detail-subtask">
                <input
                  type="checkbox"
                  checked={s.done}
                  onChange={() => handleToggleSubtask(s.id)}
                />
                <span className={s.done ? 'task-detail-subtask-done' : ''}>{s.title}</span>
                <button type="button" className="task-detail-remove" onClick={() => handleRemoveSubtask(s.id)}>
                  ×
                </button>
              </div>
            ))}
            <div className="task-detail-add-subtask">
              <input
                type="text"
                className="task-detail-input"
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                placeholder="Subtask title"
              />
              <button type="button" className="btn-secondary task-detail-btn-sm" onClick={handleAddSubtask}>
                Add subtask
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="task-detail-actions">
        {task && (
          <button type="button" className="btn-secondary" onClick={() => deleteTask(task.id)}>
            Delete
          </button>
        )}
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
};

export default TaskDetailPanel;
