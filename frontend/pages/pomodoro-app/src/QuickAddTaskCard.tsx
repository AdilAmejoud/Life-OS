import React, { useState } from 'react';
import { usePomodoro } from './state';
import type { Priority } from './types';

function todayDateString(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

interface QuickAddTaskCardProps {
  onClose: () => void;
  defaultListId?: string;
}

export const QuickAddTaskCard: React.FC<QuickAddTaskCardProps> = ({ onClose, defaultListId = 'personal' }) => {
  const { lists, addTask } = usePomodoro();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>('medium');
  const [listId, setListId] = useState(defaultListId);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  const dueLabel = dueDate === todayDateString() ? 'Today' : dueDate === tomorrowDateString() ? 'Tomorrow' : dueDate || null;

  const handleAdd = () => {
    const t = title.trim();
    if (!t) return;
    addTask({
      title: t,
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
      priority,
      listId,
      status: 'todo'
    });
    onClose();
  };

  const setDueToday = () => setDueDate(dueDate === todayDateString() ? null : todayDateString());
  const setDueTomorrow = () => setDueDate(dueDate === tomorrowDateString() ? null : tomorrowDateString());

  const selectedList = lists.find((l) => l.id === listId);

  return (
    <div className="quick-add-backdrop" onClick={onClose}>
      <div className="quick-add-card" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          className="quick-add-title"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAdd()}
          autoFocus
        />
        <textarea
          className="quick-add-description"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <div className="quick-add-chips">
          <button
            type="button"
            className={`quick-add-chip${dueLabel === 'Today' ? ' active' : ''}`}
            onClick={setDueToday}
          >
            Today{dueLabel === 'Today' && <span className="quick-add-chip-x" onClick={(e) => { e.stopPropagation(); setDueDate(null); }}>×</span>}
          </button>
          <button
            type="button"
            className={`quick-add-chip${dueLabel === 'Tomorrow' ? ' active' : ''}`}
            onClick={setDueTomorrow}
          >
            Tomorrow{dueLabel === 'Tomorrow' && <span className="quick-add-chip-x" onClick={(e) => { e.stopPropagation(); setDueDate(null); }}>×</span>}
          </button>
          <div className="quick-add-priority-wrap">
            <button
              type="button"
              className={`quick-add-chip quick-add-priority${priority !== 'medium' ? ' active' : ''}`}
              onClick={() => setPriority(priority === 'high' ? 'medium' : 'high')}
              title="Priority"
            >
              P{priority === 'high' ? '1' : priority === 'low' ? '3' : '2'}
            </button>
          </div>
        </div>
        <div className="quick-add-project-wrap">
          <button
            type="button"
            className="quick-add-project-btn"
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
          >
            <span className="quick-add-project-icon">📥</span>
            {selectedList?.name ?? 'Inbox'}
          </button>
          {projectDropdownOpen && (
            <>
              <div className="quick-add-project-backdrop" onClick={() => setProjectDropdownOpen(false)} />
              <div className="quick-add-project-dropdown">
                <div className="quick-add-project-label">My Projects</div>
                {lists.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={`quick-add-project-option${listId === l.id ? ' selected' : ''}`}
                    onClick={() => { setListId(l.id); setProjectDropdownOpen(false); }}
                  >
                    {l.name}
                    {listId === l.id && <span className="quick-add-check">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="quick-add-actions">
          <button type="button" className="quick-add-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="quick-add-submit" onClick={handleAdd} disabled={!title.trim()}>
            Add task
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickAddTaskCard;
