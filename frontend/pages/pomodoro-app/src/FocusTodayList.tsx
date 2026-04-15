import React, { useMemo } from 'react';
import { usePomodoro } from './state';
import type { Task, TaskStatus, List } from './types';

function todayDateString(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

function getStatusLabel(status: TaskStatus): string {
  switch (status) {
    case 'todo':
    case 'later':
      return 'Not started';
    case 'doing':
      return 'In progress';
    case 'done':
      return 'Done';
    default:
      return 'Not started';
  }
}

export const FocusTodayList: React.FC = () => {
  const { tasks, lists, selectTask, toggleTaskDone, updateTask, timer } = usePomodoro();

  const today = todayDateString();
  const todayTasks = useMemo(() => {
    return tasks
      .filter(
        (t) =>
          !t.archived &&
          (t.dueDate === today || (t.dueDate && t.dueDate < today))
      )
      .sort((a, b) => {
        const doneA = a.status === 'done' ? 1 : 0;
        const doneB = b.status === 'done' ? 1 : 0;
        if (doneA !== doneB) return doneA - doneB;
        return a.order - b.order;
      });
  }, [tasks, today]);

  const listById = useMemo(() => {
    const m: Record<string, List> = {};
    lists.forEach((l) => (m[l.id] = l));
    return m;
  }, [lists]);

  const handleRowClick = (task: Task) => {
    selectTask(task.id);
    if (task.status !== 'done') {
      updateTask(task.id, { status: 'doing' });
    }
  };

  const handleToggleDone = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    toggleTaskDone(taskId);
  };

  return (
    <section className="focus-today-list">
      <header className="focus-today-list-header">
        <h2 className="focus-today-list-title">Today</h2>
        <p className="focus-today-list-subtitle">Pick a task to focus on</p>
      </header>

      {todayTasks.length === 0 ? (
        <div className="focus-today-list-empty">
          <p>No tasks for today. Add some on the Tasks page.</p>
        </div>
      ) : (
        <ul className="focus-today-list-ul">
          {todayTasks.map((task) => {
            const isCurrent = timer.currentTaskId === task.id;
            return (
              <li
                key={task.id}
                className={`focus-today-list-row${isCurrent ? ' is-current' : ''}${task.status === 'done' ? ' is-done' : ''}`}
                onClick={() => handleRowClick(task)}
              >
                <span className="focus-today-list-status">
                  {getStatusLabel(task.status)}
                </span>
                <span className="focus-today-list-title-text">{task.title}</span>
                {listById[task.listId] && (
                  <span className="focus-today-list-project">
                    {listById[task.listId].name}
                  </span>
                )}
                <button
                  type="button"
                  className="focus-today-list-checkbox"
                  onClick={(e) => handleToggleDone(e, task.id)}
                  aria-label={task.status === 'done' ? 'Mark incomplete' : 'Mark done'}
                  title={task.status === 'done' ? 'Mark incomplete' : 'Mark done'}
                >
                  {task.status === 'done' ? '✓' : ''}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default FocusTodayList;
