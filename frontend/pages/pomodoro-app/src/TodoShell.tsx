import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePomodoro } from './state';
import type { Task, ViewId, TaskStatus, List, Priority } from './types';
import { TaskDetailPanel } from './TaskDetailPanel';
import { TemplatesModal } from './TemplatesModal';
import { QuickAddTaskCard } from './QuickAddTaskCard';

type DisplayLayout = 'list' | 'board' | 'calendar';
type SortOption = 'smart' | 'date' | 'priority';
type FilterPriority = 'all' | 'low' | 'medium' | 'high';

const SIDEBAR_VIEWS: { id: ViewId; label: string; showCount?: boolean; icon: string }[] = [
  { id: 'inbox', label: 'Inbox', showCount: true, icon: '📥' },
  { id: 'today', label: 'Today', showCount: true, icon: '📅' },
  { id: 'upcoming', label: 'Upcoming', icon: '🗓️' },
  { id: 'review', label: 'Filters & Labels', icon: '⧉' },
  { id: 'done', label: 'Completed', icon: '✓' }
];

function todayDateString(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function filterTasksByView(tasks: Task[], view: ViewId, selectedListId: string): Task[] {
  const notDone = (t: Task) => t.status !== 'done';
  const notArchived = (t: Task) => !t.archived;

  switch (view) {
    case 'inbox':
      return tasks.filter(t => notDone(t) && notArchived(t));
    case 'today': {
      const today = todayDateString();
      return tasks.filter(t => notDone(t) && notArchived(t) && (t.dueDate === today || (t.dueDate && t.dueDate < today)));
    }
    case 'upcoming':
    case 'agenda':
      return tasks.filter(t => notDone(t) && notArchived(t) && (t.dueDate || t.startDate)).sort((a, b) => {
        const ad = a.dueDate || a.startDate || '';
        const bd = b.dueDate || b.startDate || '';
        return ad.localeCompare(bd);
      });
    case 'board':
      return tasks.filter(t => notArchived(t) && (selectedListId ? t.listId === selectedListId : true));
    case 'projects':
      return tasks.filter(t => notDone(t) && notArchived(t) && (selectedListId ? t.listId === selectedListId : true));
    case 'contexts':
      return tasks.filter(t => notDone(t) && notArchived(t));
    case 'nextActions':
      return tasks.filter(t => notDone(t) && notArchived(t) && (t.status === 'todo' || t.status === 'doing'));
    case 'waitingFor':
      return tasks.filter(t => notDone(t) && notArchived(t) && (t.status === 'later' || (t.tags && t.tags.includes('waiting'))));
    case 'somedayMaybe':
      return tasks.filter(t => notDone(t) && notArchived(t) && (t.listId === 'someday' || t.status === 'later'));
    case 'calendar':
      return tasks.filter(t => notDone(t) && notArchived(t) && t.dueDate);
    case 'review':
      return tasks.filter(t => notDone(t) && notArchived(t) && (!t.dueDate || (t.tags && t.tags.includes('review'))));
    case 'tutorial':
      return [];
    case 'done':
      return tasks.filter(t => t.status === 'done' && notArchived(t));
    case 'archived':
      return tasks.filter(t => t.archived);
    default:
      return tasks.filter(t => notDone(t) && notArchived(t));
  }
}

function filterBySearch(tasks: Task[], q: string): Task[] {
  if (!q.trim()) return tasks;
  const lower = q.toLowerCase();
  return tasks.filter(
    t =>
      t.title.toLowerCase().includes(lower) ||
      (t.description && t.description.toLowerCase().includes(lower)) ||
      (t.notes && t.notes.toLowerCase().includes(lower)) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(lower)))
  );
}

function formatDueDisplay(dueDate: string | null | undefined): string {
  if (!dueDate) return '';
  const today = todayDateString();
  if (dueDate === today) return 'Today';
  const d = new Date(dueDate + 'T12:00:00');
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.getFullYear() + '-' + String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrow.getDate()).padStart(2, '0');
  if (dueDate === tomorrowStr) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: dueDate.slice(0, 4) !== String(now.getFullYear()) ? 'numeric' : undefined });
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'doing', title: 'Doing' },
  { id: 'later', title: 'Later' },
  { id: 'done', title: 'Done' }
];

export const TodoShell: React.FC = () => {
  const {
    tasks,
    lists,
    selectedListId,
    selectedView,
    setSelectedListId,
    setSelectedView,
    selectedTaskId,
    setSelectedTaskId,
    searchQuery,
    setSearchQuery,
    addTask,
    selectTask,
    toggleTaskDone,
    updateTask,
    moveTaskInColumn,
    timer
  } = usePomodoro();
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [displayPanelOpen, setDisplayPanelOpen] = useState(false);
  const [displayLayout, setDisplayLayout] = useState<DisplayLayout>('list');
  const [dateNavigatorOffset, setDateNavigatorOffset] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>('smart');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleImportTasks = (rows: { title: string; listId: string; sectionId?: string | null; dueDate?: string | null }[]) => {
    rows.forEach(row => {
      let sectionId: string | null = row.sectionId ?? null;
      if (sectionId && listById[row.listId]?.sections) {
        const sec = listById[row.listId].sections!.find(s => s.id === sectionId || s.name === sectionId);
        sectionId = sec ? sec.id : null;
      }
      addTask({
        title: row.title,
        status: 'todo',
        listId: row.listId,
        sectionId: sectionId ?? undefined,
        dueDate: row.dueDate ?? undefined
      });
    });
  };

  const countsByList = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status !== 'done' && !t.archived) map[t.listId] = (map[t.listId] || 0) + 1;
    }
    return map;
  }, [tasks]);


  const viewTitle = SIDEBAR_VIEWS.find(v => v.id === selectedView)?.label ?? selectedView;

  const filteredForView = useMemo(
    () => filterTasksByView(tasks, selectedView, selectedListId),
    [tasks, selectedView, selectedListId]
  );
  const filteredByPriority = useMemo(() => {
    if (filterPriority === 'all') return filteredForView;
    return filteredForView.filter(t => t.priority === filterPriority);
  }, [filteredForView, filterPriority]);
  const filteredWithSearch = useMemo(
    () => filterBySearch(filteredByPriority, searchQuery),
    [filteredByPriority, searchQuery]
  );
  const sortedForDisplay = useMemo(() => {
    const list = [...filteredWithSearch];
    if (sortBy === 'date') {
      list.sort((a, b) => {
        const ad = a.dueDate || a.startDate || '9999-99-99';
        const bd = b.dueDate || b.startDate || '9999-99-99';
        return ad.localeCompare(bd);
      });
    } else if (sortBy === 'priority') {
      const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
      list.sort((a, b) => order[a.priority] - order[b.priority]);
    }
    return list;
  }, [filteredWithSearch, sortBy]);

  const groupedByList = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of sortedForDisplay) {
      const listId = t.listId;
      if (!map[listId]) map[listId] = [];
      map[listId].push(t);
    }
    Object.keys(map).forEach(listId => {
      map[listId].sort((a, b) => a.order - b.order);
    });
    return map;
  }, [sortedForDisplay]);

  const byColumn = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], doing: [], later: [], done: [] };
    for (const t of sortedForDisplay) {
      map[t.status].push(t);
    }
    (Object.keys(map) as TaskStatus[]).forEach(col => map[col].sort((a, b) => a.order - b.order));
    return map;
  }, [sortedForDisplay]);

  const byDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of sortedForDisplay) {
      const d = t.dueDate || 'No date';
      if (!map[d]) map[d] = [];
      map[d].push(t);
    }
    Object.keys(map).forEach(d => map[d].sort((a, b) => a.order - b.order));
    return map;
  }, [sortedForDisplay]);

  const listById = useMemo(() => {
    const m: Record<string, List> = {};
    lists.forEach(l => (m[l.id] = l));
    return m;
  }, [lists]);

  const handleQuickAdd = () => {
    const title = quickAddTitle.trim();
    if (!title) return;
    addTask({ title, status: 'todo', listId: selectedListId });
    setQuickAddTitle('');
  };

  const handleAddTaskInList = (listId: string) => {
    const title = window.prompt('Task title');
    if (!title?.trim()) return;
    addTask({ title: title.trim(), status: 'todo', listId });
  };

  const handleRowClick = (task: Task) => {
    selectTask(task.id);
    setSelectedTaskId(task.id);
  };

  const handleListChange = (taskId: string, newListId: string) => {
    updateTask(taskId, { listId: newListId });
  };

  const showListContent = (['inbox', 'today', 'upcoming', 'agenda', 'nextActions', 'waitingFor', 'somedayMaybe', 'review', 'done', 'archived'].includes(selectedView) && displayLayout === 'list') || selectedView === 'projects' || selectedView === 'contexts';
  const showBoard = displayLayout === 'board' && ['inbox', 'today', 'upcoming', 'agenda', 'review', 'done'].includes(selectedView);
  const showCalendar = displayLayout === 'calendar' && ['inbox', 'today', 'upcoming', 'agenda', 'review'].includes(selectedView);
  const showProjects = selectedView === 'projects';
  const showContexts = selectedView === 'contexts';
  const showTutorial = selectedView === 'tutorial';

  function getWeekStartForOffset(weeksOffset: number): Date {
    const now = new Date();
    const day = now.getDay();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - day + weeksOffset * 7);
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  }

  function dateToYmd(d: Date): string {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  return (
    <>
    <section className="todo-shell">
      <header className="todo-shell-header">
        <div>
          <div className="todo-shell-title">{viewTitle}</div>
          <div className="todo-shell-subtitle">
            {selectedListId ? listById[selectedListId]?.name ?? viewTitle : viewTitle}
          </div>
        </div>
        <div className="todo-shell-header-actions">
          <button type="button" className="todo-shell-pill todo-shell-display-btn" onClick={() => setDisplayPanelOpen(true)}>
            Display
          </button>
        </div>
      </header>

      <div className="todo-main">
        <aside className="todo-sidebar card-surface" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>

          <div className="todo-sidebar-profile">
            <div className="user-profile-btn">
              <span className="avatar">A</span>
              <span className="name">Adil</span>
            </div>
          </div>

          <div className="todo-sidebar-add-task">
            <button type="button" className="btn-add-global" onClick={() => setSelectedTaskId('new')}>
              <span className="add-icon">⊕</span> Add task
            </button>
          </div>

          <div className="todo-sidebar-search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="todo-sidebar-search"
              placeholder="Search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="todo-sidebar-search-clear" onClick={() => setSearchQuery('')}>
                ×
              </button>
            )}
          </div>

          <div className="todo-sidebar-views">
            {SIDEBAR_VIEWS.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedView(v.id)}
                className={`todo-view-item${selectedView === v.id ? ' active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="view-icon" style={{ opacity: selectedView === v.id ? 1 : 0.6 }}>{v.icon}</span>
                  <span>{v.label}</span>
                </div>
                {v.showCount && v.id === 'today' && (
                  <span className="todo-sidebar-item-count">
                    {tasks.filter(t => t.status !== 'done' && !t.archived && (t.dueDate === todayDateString() || (t.dueDate && t.dueDate < todayDateString()))).length || ''}
                  </span>
                )}
                {v.showCount && v.id === 'inbox' && (
                  <span className="todo-sidebar-item-count">
                    {tasks.filter(t => t.status !== 'done' && !t.archived).length || ''}
                  </span>
                )}
              </button>
            ))}
          </div>

          {selectedView === 'projects' && (
            <div className="todo-sidebar-block">
              <div className="todo-sidebar-section-title">Lists</div>
              <div className="todo-sidebar-list">
                {lists.map(list => (
                  <SidebarItem
                    key={list.id}
                    active={selectedListId === list.id}
                    label={list.name}
                    count={countsByList[list.id] || 0}
                    onClick={() => setSelectedListId(list.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="todo-sidebar-settings-wrap">
            <button type="button" className="todo-sidebar-settings" onClick={() => setTemplatesModalOpen(true)}>
              Templates
            </button>
            <button type="button" className="todo-sidebar-settings" onClick={() => window.alert('Settings — Coming soon')}>
              Settings
            </button>
          </div>
        </aside>

        <div className="todo-list-content">
          <div className="todo-quick-add-wrap">
            <input
              type="text"
              className="todo-quick-add-input"
              placeholder="Add Task — Example: Call mom, Meet tomorrow"
              value={quickAddTitle}
              onChange={e => setQuickAddTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
            />
            <button type="button" className="btn-primary" onClick={handleQuickAdd}>
              Add
            </button>
            <button type="button" className="btn-secondary" onClick={() => setSelectedTaskId('new')}>
              Add with details
            </button>
          </div>

          {showTutorial && (
            <div className="todo-tutorial-placeholder">
              <p>Getting started with your task manager.</p>
              <p>Use the sidebar to switch views: Inbox, Board, Calendar, and more.</p>
            </div>
          )}

          {showListContent && !showTutorial && (
            <div className="todo-list-scroll">
              <div className="todo-view-header">
                <h2>{viewTitle}</h2>
                {selectedView === 'today' && <span className="view-task-count">{tasks.filter(t => t.status !== 'done' && !t.archived && (t.dueDate === todayDateString() || (t.dueDate && t.dueDate < todayDateString()))).length} tasks</span>}
              </div>

              {selectedView === 'upcoming' && (
                <div className="date-navigator">
                  <div className="date-navigator-month-row">
                    <button type="button" className="date-navigator-arrow" onClick={() => setDateNavigatorOffset(d => d - 1)} aria-label="Previous week">←</button>
                    <span className="date-navigator-month">
                      {(() => {
                        const weekStart = getWeekStartForOffset(dateNavigatorOffset);
                        return weekStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                      })()}
                    </span>
                    <button type="button" className="date-navigator-arrow" onClick={() => setDateNavigatorOffset(d => d + 1)} aria-label="Next week">→</button>
                  </div>
                  <div className="date-navigator-week">
                    {(() => {
                      const weekStart = getWeekStartForOffset(dateNavigatorOffset);
                      const todayYmd = todayDateString();
                      return Array.from({ length: 7 }, (_, i) => {
                        const d = new Date(weekStart);
                        d.setDate(weekStart.getDate() + i);
                        const ymd = dateToYmd(d);
                        const isToday = ymd === todayYmd;
                        const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
                        const dayNum = d.getDate();
                        return (
                          <button
                            key={ymd}
                            type="button"
                            className={`date-navigator-day${isToday ? ' is-today' : ''}`}
                            onClick={() => setDateNavigatorOffset(0)}
                          >
                            {dayName} {dayNum}
                            {isToday && <span className="date-navigator-today-label">Today</span>}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {selectedView === 'inbox' && filteredWithSearch.length === 0 ? (
                <div className="inbox-empty-state">
                  <div className="empty-state-illustration">
                    <svg viewBox="0 0 64 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M4 8h56v40H4V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.3"/>
                      <path d="M4 8l28 18 28-18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      <path d="M8 14v30h48V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6"/>
                    </svg>
                  </div>
                  <h3>Capture now, plan later</h3>
                  <p>Inbox is your go-to spot for quick task entry. Clear your mind now, organize when you're ready.</p>
                  <button type="button" className="btn-add-empty" onClick={() => setSelectedTaskId('new')}>
                    + Add task
                  </button>
                </div>
              ) : (selectedView === 'today' || selectedView === 'upcoming') ? (
                Object.keys(byDate).length > 0 ? (
                  Object.entries(byDate).map(([date, dateTasks]) => (
                    <div key={date} className="task-group">
                      <div className="task-group-title date-title">{date === todayDateString() ? `Today · ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}` : date}</div>
                      <div className="task-group-list">
                        {dateTasks.map(task => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            lists={lists}
                            isSelected={timer.currentTaskId === task.id}
                            onSelect={() => handleRowClick(task)}
                            onToggleDone={toggleTaskDone}
                            onListChange={handleListChange}
                            onEdit={() => handleRowClick(task)}
                            formatDue={formatDueDisplay}
                          />
                        ))}
                      </div>
                      <button type="button" className="add-task-link" onClick={() => setSelectedTaskId('new')}>
                        + Add task
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="task-group">
                    <button type="button" className="add-task-link" onClick={() => setSelectedTaskId('new')}>
                      + Add task
                    </button>
                  </div>
                )
              ) : Object.keys(groupedByList).length > 0 ? (
                Object.entries(groupedByList).map(([listId, listTasks]) => {
                  const listName = listById[listId]?.name ?? listId;
                  return (
                    <div key={listId} className="task-group">
                      <div className="task-group-title">{listName}</div>
                      <div className="task-group-list">
                        {listTasks.map(task => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            lists={lists}
                            isSelected={timer.currentTaskId === task.id}
                            onSelect={() => handleRowClick(task)}
                            onToggleDone={toggleTaskDone}
                            onListChange={handleListChange}
                            onEdit={() => handleRowClick(task)}
                            formatDue={formatDueDisplay}
                          />
                        ))}
                      </div>
                      {selectedView !== 'done' && selectedView !== 'archived' && (
                        <button type="button" className="add-task-link" onClick={() => handleAddTaskInList(listId)}>
                          + Add task
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="task-group">
                  <button
                    type="button"
                    className="add-task-link"
                    onClick={() => setSelectedTaskId('new')}
                  >
                    + Add task
                  </button>
                </div>
              )}
            </div>
          )}

          {showBoard && !showTutorial && (
            <div className="task-sections">
              {COLUMNS.map(col => {
                const columnTasks = byColumn[col.id];
                return (
                  <div key={col.id} className="task-section" data-column={col.id}>
                    <div className="task-section-header">
                      <span className="task-section-title">{col.title}</span>
                      <span className="task-section-count">{columnTasks.length}</span>
                    </div>
                    <div
                      className="task-section-list"
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData('text/task-id');
                        if (id) moveTaskInColumn(id, col.id);
                      }}
                    >
                      <button
                        type="button"
                        className="btn-task"
                        onClick={() => handleAddTaskInList(selectedListId)}
                      >
                        + New Task
                      </button>
                      {columnTasks.map(task => (
                        <article
                          key={task.id}
                          className={`task-item${timer.currentTaskId === task.id ? ' current-task' : ''}${task.status === 'done' ? ' completed' : ''}`}
                          draggable
                          onDragStart={e => e.dataTransfer.setData('text/task-id', task.id)}
                          onClick={() => handleRowClick(task)}
                        >
                          <div className="task-top">
                            <div className="task-name">{task.title}</div>
                            <div className="task-pomodoros">
                              {task.completedPomodoros}/{task.estimatedPomodoros} 🍅
                            </div>
                          </div>
                          {(task.dueDate || (task.tags && task.tags.length > 0)) && (
                            <div className="task-meta-row">
                              {task.dueDate && <span className="task-row-due">{formatDueDisplay(task.dueDate)}</span>}
                              {task.tags?.map(tag => (
                                <span key={tag} className="task-tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showCalendar && !showTutorial && (
            <div className="todo-list-scroll">
              {Object.entries(byDate).map(([date, dateTasks]) => (
                <div key={date} className="task-group">
                  <div className="task-group-title">{date}</div>
                  <div className="task-group-list">
                    {dateTasks.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        lists={lists}
                        isSelected={timer.currentTaskId === task.id}
                        onSelect={() => handleRowClick(task)}
                        onToggleDone={toggleTaskDone}
                        onListChange={handleListChange}
                        onEdit={() => handleRowClick(task)}
                        formatDue={formatDueDisplay}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showProjects && !showTutorial && (
            <div className="todo-list-scroll">
              {Object.entries(groupedByList).map(([listId, listTasks]) => {
                const listName = listById[listId]?.name ?? listId;
                const list = listById[listId];
                const sections = list?.sections?.slice().sort((a, b) => a.order - b.order);
                if (sections && sections.length > 0) {
                  return (
                    <div key={listId} className="task-group">
                      <div className="task-group-title project-title">{listName}</div>
                      {sections.map(section => {
                        const sectionTasks = listTasks.filter(t => t.sectionId === section.id);
                        const isCollapsed = collapsedSections.has(section.id);
                        return (
                          <div key={section.id} className="project-section">
                            <button type="button" className="project-section-header" onClick={() => toggleSection(section.id)}>
                              <span className="project-section-chevron" aria-hidden>{isCollapsed ? '▶' : '▼'}</span>
                              <span>{section.name}</span>
                            </button>
                            {!isCollapsed && (
                              <div className="task-group-list">
                                {sectionTasks.map(task => (
                                  <TaskRow
                                    key={task.id}
                                    task={task}
                                    lists={lists}
                                    isSelected={timer.currentTaskId === task.id}
                                    onSelect={() => handleRowClick(task)}
                                    onToggleDone={toggleTaskDone}
                                    onListChange={handleListChange}
                                    onEdit={() => handleRowClick(task)}
                                    formatDue={formatDueDisplay}
                                  />
                                ))}
                              </div>
                            )}
                            {!isCollapsed && (
                              <button type="button" className="add-task-link" onClick={() => { const title = window.prompt('Task title'); if (title?.trim()) addTask({ title: title.trim(), status: 'todo', listId, sectionId: section.id }); }}>
                                + Add task
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {listTasks.filter(t => !t.sectionId).length > 0 && (
                        <div className="project-section">
                          <div className="project-section-header project-section-header-static">Other</div>
                          <div className="task-group-list">
                            {listTasks.filter(t => !t.sectionId).map(task => (
                              <TaskRow
                                key={task.id}
                                task={task}
                                lists={lists}
                                isSelected={timer.currentTaskId === task.id}
                                onSelect={() => handleRowClick(task)}
                                onToggleDone={toggleTaskDone}
                                onListChange={handleListChange}
                                onEdit={() => handleRowClick(task)}
                                formatDue={formatDueDisplay}
                              />
                            ))}
                          </div>
                          <button type="button" className="add-task-link" onClick={() => handleAddTaskInList(listId)}>
                            + Add task
                          </button>
                        </div>
                      )}
                      <button type="button" className="add-task-link" onClick={() => handleAddTaskInList(listId)}>
                        + Add task
                      </button>
                    </div>
                  );
                }
                return (
                  <div key={listId} className="task-group">
                    <div className="task-group-title">{listName}</div>
                    <div className="task-group-list">
                      {listTasks.map(task => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          lists={lists}
                          isSelected={timer.currentTaskId === task.id}
                          onSelect={() => handleRowClick(task)}
                          onToggleDone={toggleTaskDone}
                          onListChange={handleListChange}
                          onEdit={() => handleRowClick(task)}
                          formatDue={formatDueDisplay}
                        />
                      ))}
                    </div>
                    <button type="button" className="add-task-link" onClick={() => handleAddTaskInList(listId)}>
                      + Add task
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {showContexts && !showTutorial && (
            <div className="todo-list-scroll">
              {filteredWithSearch.length === 0 ? (
                <div className="task-group">
                  <div className="task-group-title">Contexts</div>
                  <p className="todo-empty-hint">Select a context from the sidebar or add contexts to tasks.</p>
                </div>
              ) : (
                Object.entries(groupedByList).map(([listId, listTasks]) => (
                  <div key={listId} className="task-group">
                    <div className="task-group-title">{listById[listId]?.name ?? listId}</div>
                    <div className="task-group-list">
                      {listTasks.map(task => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          lists={lists}
                          isSelected={timer.currentTaskId === task.id}
                          onSelect={() => handleRowClick(task)}
                          onToggleDone={toggleTaskDone}
                          onListChange={handleListChange}
                          onEdit={() => handleRowClick(task)}
                          formatDue={formatDueDisplay}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {selectedTaskId === 'new' &&
            createPortal(
              <QuickAddTaskCard
                onClose={() => setSelectedTaskId(null)}
                defaultListId={selectedListId}
              />,
              document.body
            )}
          {selectedTaskId !== null && selectedTaskId !== 'new' && (
            <div className="task-detail-panel-wrap">
              <TaskDetailPanel
                taskId={selectedTaskId}
                isNew={false}
                onClose={() => setSelectedTaskId(null)}
                defaultListId={selectedListId}
              />
            </div>
          )}
        </div>
      </div>

      {displayPanelOpen && (
        <>
          <div className="display-panel-backdrop" onClick={() => setDisplayPanelOpen(false)} aria-hidden />
          <aside className={`display-panel${displayPanelOpen ? ' is-open' : ''}`}>
            <div className="display-panel-header">
              <h3 className="display-panel-title">Display</h3>
              <button type="button" className="display-panel-close" onClick={() => setDisplayPanelOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="display-panel-section">
              <div className="display-panel-label">Layout</div>
              <div className="display-panel-layout-btns">
                <button type="button" className={`display-panel-layout-btn${displayLayout === 'list' ? ' active' : ''}`} onClick={() => setDisplayLayout('list')}>List</button>
                <button type="button" className={`display-panel-layout-btn${displayLayout === 'board' ? ' active' : ''}`} onClick={() => setDisplayLayout('board')}>Board</button>
                <button type="button" className={`display-panel-layout-btn${displayLayout === 'calendar' ? ' active' : ''}`} onClick={() => setDisplayLayout('calendar')}>Calendar</button>
              </div>
            </div>
            <div className="display-panel-section">
              <div className="display-panel-label">Sort</div>
              <select className="display-panel-select" value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)} aria-label="Sort by">
                <option value="smart">Smart</option>
                <option value="date">Date</option>
                <option value="priority">Priority</option>
              </select>
            </div>
            <div className="display-panel-section">
              <div className="display-panel-label">Filter</div>
              <div className="display-panel-label display-panel-sublabel">Priority</div>
              <select className="display-panel-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value as FilterPriority)} aria-label="Filter by priority">
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </aside>
        </>
      )}
    </section>

    {templatesModalOpen && (
      <TemplatesModal
        onClose={() => setTemplatesModalOpen(false)}
        onImportTasks={handleImportTasks}
        lists={lists}
      />
    )}
  </>
  );
};

const TaskRow: React.FC<{
  task: Task;
  lists: List[];
  isSelected: boolean;
  onSelect: () => void;
  onToggleDone: (id: string) => void;
  onListChange: (taskId: string, listId: string) => void;
  onEdit: () => void;
  formatDue: (d: string | null | undefined) => string;
}> = ({ task, lists, isSelected, onSelect, onToggleDone, onListChange, onEdit, formatDue }) => (
  <div
    className={`task-row${isSelected ? ' current-task' : ''}${task.status === 'done' ? ' completed' : ''}`}
    onClick={onSelect}
  >
    <button
      type="button"
      className="task-row-checkbox"
      onClick={e => { e.stopPropagation(); onToggleDone(task.id); }}
      aria-label={task.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
    >
      {task.status === 'done' ? '✓' : ''}
    </button>
    <div className="task-row-body">
      <span className="task-row-title">{task.title}</span>
      {(task.description || task.notes) && (
        <div className="task-row-description">
          {(task.description || task.notes || '').slice(0, 80)}
          {(task.description || task.notes || '').length > 80 ? '…' : ''}
        </div>
      )}
      <div className="task-row-meta">
        {task.dueDate && <span className="task-row-due">{formatDue(task.dueDate)}</span>}
        {task.tags && task.tags.length > 0 && (
          <span className="task-row-tags">
            {task.tags.map(tag => (
              <span key={tag} className="task-tag">
                {tag}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
    <select
      className="task-row-list-select"
      value={task.listId}
      onClick={e => e.stopPropagation()}
      onChange={e => onListChange(task.id, e.target.value)}
      aria-label="Project"
    >
      {lists.map(l => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </select>
    <button type="button" className="task-row-edit" onClick={e => { e.stopPropagation(); onEdit(); }} aria-label="Edit">
      ✎
    </button>
  </div>
);

const SidebarItem: React.FC<{ label: string; count: number; active: boolean; onClick: () => void }> = ({
  label,
  count,
  active,
  onClick
}) => (
  <button type="button" onClick={onClick} className={`todo-sidebar-item${active ? ' active' : ''}`}>
    <span>{label}</span>
    <span className="todo-sidebar-item-count">{count}</span>
  </button>
);

export default TodoShell;
