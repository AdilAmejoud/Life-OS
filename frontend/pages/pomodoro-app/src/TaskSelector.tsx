import React, { useMemo } from 'react';
import { usePomodoro } from './state';
import type { TaskStatus, List } from './types';

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

export const TaskSelector: React.FC = () => {
  const { tasks, lists, selectTask, timer } = usePomodoro();

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

  const handleSelectTask = (taskId: string) => {
    selectTask(taskId);
  };

  if (todayTasks.length === 0) {
    return (
      <div className="task-selector">
        <div className="task-selector-header">
          <h3 className="task-selector-title">Task Selector</h3>
          <p className="task-selector-subtitle">Pick a task to focus on</p>
        </div>
        <div className="task-selector-empty">
          <p>No tasks for today.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-selector">
      <div className="task-selector-header">
        <h3 className="task-selector-title">Task Selector</h3>
        <span className="task-selector-count">{todayTasks.length} task{todayTasks.length !== 1 ? 's' : ''}</span>
      </div>

      <ul className="task-selector-list">
        {todayTasks.map((task) => {
          const isCurrent = timer.currentTaskId === task.id;
          const list = listById[task.listId];
          const progressPercent =
            task.estimatedPomodoros > 0
              ? Math.min(100, Math.round((task.completedPomodoros / task.estimatedPomodoros) * 100))
              : 0;

          return (
            <li
              key={task.id}
              className={`task-selector-item${isCurrent ? ' active' : ''}${task.status === 'done' ? ' completed' : ''}`}
              onClick={() => handleSelectTask(task.id)}
            >
              <div className="task-selector-item-main">
                <div className="task-selector-item-header">
                  <span className={`task-selector-item-status${isCurrent ? ' active-status' : ''}`}>
                    {getStatusLabel(task.status)}
                  </span>
                  {task.dueDate && (
                    <span className="task-selector-item-due">
                      {task.dueDate === today ? 'Today' : task.dueDate}
                    </span>
                  )}
                </div>
                <span className="task-selector-item-title">{task.title}</span>
                {list && (
                  <span className="task-selector-item-project">{list.name}</span>
                )}
              </div>

              <div className="task-selector-item-footer">
                <div className="task-selector-item-progress">
                  <div className="task-selector-item-progress-bar-bg">
                    <div
                      className={`task-selector-item-progress-bar${task.status === 'done' ? ' completed' : ''}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="task-selector-item-progress-text">
                    {task.completedPomodoros}/{task.estimatedPomodoros}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default TaskSelector;
