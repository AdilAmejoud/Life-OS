import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Task, List, Context, TimerConfig, TimerState, TimerMode, TaskStatus, TaskAttachment } from './types';
import type { ViewId } from './types';

interface PomodoroContextValue {
  config: TimerConfig;
  timer: TimerState;
  tasks: Task[];
  lists: List[];
  contexts: Context[];
  selectedListId: string;
  selectedView: ViewId;
  selectedTaskId: string | null;
  searchQuery: string;
  setSelectedListId: (id: string) => void;
  setSelectedView: (view: ViewId) => void;
  setSelectedTaskId: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  start: () => void;
  pause: () => void;
  resetCurrentMode: () => void;
  skipSession: () => void;
  selectTask: (id: string | null) => void;
  addTask: (partial: Partial<Task> & { title: string }) => void;
  updateTask: (id: string, partial: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  archiveTask: (id: string) => void;
  quickUpdateTaskStatus: (id: string, status: TaskStatus) => void;
  moveTaskInColumn: (id: string, status: TaskStatus) => void;
  toggleTaskDone: (id: string) => void;
  addReminder: (taskId: string, at: number) => void;
  removeReminder: (taskId: string, at: number) => void;
  addAttachment: (taskId: string, attachment: TaskAttachment) => void;
  removeAttachment: (taskId: string, attachmentId: string) => void;
}

const PomodoroContext = createContext<PomodoroContextValue | undefined>(undefined);

const STORAGE_KEY = 'pomodoroDashboardState';

interface PersistedState {
  config: TimerConfig;
  timer: TimerState;
  tasks: Task[];
  lists: List[];
  selectedListId: string;
  selectedView: ViewId;
}

const DEFAULT_LISTS: List[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    sections: [
      { id: 'sec-101', listId: 'getting-started', name: 'Todoist 101', order: 0 },
      { id: 'sec-try', listId: 'getting-started', name: 'Try it: Capture → Clarify → Complete', order: 1 },
      { id: 'sec-build', listId: 'getting-started', name: 'Build (or Rebuild) Your Systems', order: 2 }
    ]
  },
  { id: 'personal', name: 'Personal' },
  { id: 'work', name: 'Work' },
  { id: 'events', name: 'Events' },
  { id: 'someday', name: 'Someday' }
];

const DEFAULT_CONTEXTS: Context[] = [
  { id: 'work', name: '@work' },
  { id: 'home', name: '@home' },
  { id: 'later', name: 'Later' }
];

function migrateTask(t: Task): Task {
  return {
    ...t,
    description: t.description ?? '',
    about: t.about ?? '',
    startDate: t.startDate ?? null,
    startTime: t.startTime ?? null,
    dueTime: t.dueTime ?? null,
    contexts: t.contexts ?? [],
    blockedBy: t.blockedBy ?? [],
    reminders: t.reminders ?? [],
    attachments: t.attachments ?? [],
    markdownNotes: t.markdownNotes ?? false,
    overdue: t.overdue ?? false,
    archived: t.archived ?? false,
    notes: t.notes ?? '',
    tags: t.tags ?? [],
    subtasks: t.subtasks ?? [],
    sectionId: t.sectionId ?? null
  };
}

const DEFAULT_CONFIG: TimerConfig = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
  longBreakAfter: 4,
  autoStartBreaks: true,
  enableSound: true
};

const DEFAULT_TIMER: TimerState = {
  mode: 'work',
  timeLeft: DEFAULT_CONFIG.work,
  totalTime: 0,
  isRunning: false,
  pomodoros: 0,
  sessions: 0,
  currentTaskId: null
};

const VIEW_IDS: ViewId[] = [
  'inbox', 'agenda', 'board', 'projects', 'contexts', 'nextActions', 'waitingFor',
  'somedayMaybe', 'calendar', 'review', 'tutorial', 'done', 'archived'
];

function isValidViewId(v: string): v is ViewId {
  return VIEW_IDS.includes(v as ViewId);
}

function loadInitialState(): PersistedState {
  if (typeof window === 'undefined') {
    return {
      config: DEFAULT_CONFIG,
      timer: DEFAULT_TIMER,
      tasks: [],
      lists: DEFAULT_LISTS,
      selectedListId: 'personal',
      selectedView: 'inbox'
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const old = window.localStorage.getItem('pomodoroTasks');
      if (old) {
        const data = JSON.parse(old);
        const tasks: Task[] = (data.tasks || []).map((t: any) => migrateTask({
          id: t.id,
          title: t.title,
          status: (t.status as TaskStatus) || 'todo',
          listId: t.list || 'personal',
          estimatedPomodoros: typeof t.estimatedPomodoros === 'number' ? t.estimatedPomodoros : 1,
          completedPomodoros: typeof t.completedPomodoros === 'number' ? t.completedPomodoros : 0,
          dueDate: t.dueDate || null,
          priority: t.priority || 'medium',
          tags: t.tags || [],
          notes: t.notes || '',
          subtasks: t.subtasks || [],
          order: typeof t.order === 'number' ? t.order : Date.now(),
          createdAt: t.createdAt || Date.now()
        }));
        return {
          config: DEFAULT_CONFIG,
          timer: DEFAULT_TIMER,
          tasks,
          lists: DEFAULT_LISTS,
          selectedListId: 'personal',
          selectedView: 'inbox'
        };
      }
      return {
        config: DEFAULT_CONFIG,
        timer: DEFAULT_TIMER,
        tasks: [],
        lists: DEFAULT_LISTS,
        selectedListId: 'personal',
        selectedView: 'inbox'
      };
    }

    const parsed = JSON.parse(raw) as PersistedState & { selectedView?: string };
    const tasks = (parsed.tasks || []).map(migrateTask);
    let selectedView: ViewId = 'inbox';
    if (parsed.selectedView && isValidViewId(parsed.selectedView)) {
      selectedView = parsed.selectedView;
    } else if (parsed.selectedView === 'today') {
      selectedView = 'agenda';
    } else if (parsed.selectedView === 'upcoming') {
      selectedView = 'calendar';
    }
    return {
      config: { ...DEFAULT_CONFIG, ...parsed.config },
      timer: { ...DEFAULT_TIMER, ...parsed.timer, isRunning: false },
      tasks,
      lists: parsed.lists && parsed.lists.length ? parsed.lists : DEFAULT_LISTS,
      selectedListId: parsed.selectedListId || 'personal',
      selectedView
    };
  } catch {
    return {
      config: DEFAULT_CONFIG,
      timer: DEFAULT_TIMER,
      tasks: [],
      lists: DEFAULT_LISTS,
      selectedListId: 'personal',
      selectedView: 'inbox'
    };
  }
}

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [{ config, timer, tasks, lists, selectedListId, selectedView }, setState] = useState<PersistedState>(loadInitialState);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const intervalRef = useRef<number | null>(null);

  // persist
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const toStore: PersistedState = { config, timer, tasks, lists, selectedListId, selectedView };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  }, [config, timer, tasks, lists, selectedListId, selectedView]);

  // ticking
  useEffect(() => {
    if (!timer.isRunning) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setState(prev => {
        const t = prev.timer;
        if (!t.isRunning) return prev;
        const nextTime = t.timeLeft - 1;
        if (nextTime > 0) {
          return { ...prev, timer: { ...t, timeLeft: nextTime, totalTime: t.totalTime + 1 } };
        }
        // session complete
        return handleSessionComplete(prev);
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timer.isRunning]);

  const handleSessionComplete = (state: PersistedState): PersistedState => {
    const { timer, config } = state;
    let tasks = state.tasks.slice();
    let pomodoros = timer.pomodoros;
    let sessions = timer.sessions;
    let mode: TimerMode = timer.mode;
    let timeLeft = timer.timeLeft;

    if (mode === 'work') {
      pomodoros += 1;
      sessions += 1;
      // increment task pomodoro
      if (timer.currentTaskId) {
        tasks = tasks.map(task => {
          if (task.id !== timer.currentTaskId) return task;
          const completedPomodoros = task.completedPomodoros + 1;
          const isDone = completedPomodoros >= task.estimatedPomodoros;
          return {
            ...task,
            completedPomodoros,
            status: isDone ? 'done' : task.status
          };
        });
      }

      const nextIsLong = pomodoros % config.longBreakAfter === 0;
      mode = nextIsLong ? 'longBreak' : 'shortBreak';
      timeLeft = nextIsLong ? config.longBreak : config.shortBreak;
    } else {
      mode = 'work';
      timeLeft = config.work;
    }

    return {
      ...state,
      timer: {
        ...state.timer,
        mode,
        timeLeft,
        totalTime: state.timer.totalTime,
        isRunning: config.autoStartBreaks,
        pomodoros,
        sessions
      },
      tasks
    };
  };

  const start = () => {
    setState(prev => ({ ...prev, timer: { ...prev.timer, isRunning: true } }));
  };

  const pause = () => {
    setState(prev => ({ ...prev, timer: { ...prev.timer, isRunning: false } }));
  };

  const resetCurrentMode = () => {
    setState(prev => {
      const { mode } = prev.timer;
      const value =
        mode === 'work' ? prev.config.work : mode === 'shortBreak' ? prev.config.shortBreak : prev.config.longBreak;
      return { ...prev, timer: { ...prev.timer, timeLeft: value, isRunning: false } };
    });
  };

  const skipSession = () => {
    setState(prev => handleSessionComplete({ ...prev, timer: { ...prev.timer, isRunning: false } }));
  };

  const selectTask = (id: string | null) => {
    setState(prev => ({ ...prev, timer: { ...prev.timer, currentTaskId: id } }));
  };

  const setSelectedListId = (id: string) => {
    setState(prev => ({ ...prev, selectedListId: id }));
  };

  const setSelectedView = (view: ViewId) => {
    setState(prev => ({ ...prev, selectedView: view }));
  };

  const toggleTaskDone = (id: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t
      )
    }));
  };

  const addTask = (partial: Partial<Task> & { title: string }) => {
    setState(prev => {
      const now = Date.now();
      const listId = partial.listId ?? prev.selectedListId ?? 'personal';
      const task: Task = migrateTask({
        id: String(now) + Math.random().toString(36).slice(2),
        title: partial.title,
        status: partial.status ?? 'todo',
        listId,
        estimatedPomodoros: partial.estimatedPomodoros ?? 1,
        completedPomodoros: partial.completedPomodoros ?? 0,
        dueDate: partial.dueDate ?? null,
        dueTime: partial.dueTime ?? null,
        startDate: partial.startDate ?? null,
        startTime: partial.startTime ?? null,
        priority: partial.priority ?? 'medium',
        tags: partial.tags ?? [],
        notes: partial.notes ?? '',
        description: partial.description ?? '',
        about: partial.about ?? '',
        contexts: partial.contexts ?? [],
        blockedBy: partial.blockedBy ?? [],
        reminders: partial.reminders ?? [],
        attachments: partial.attachments ?? [],
        markdownNotes: partial.markdownNotes ?? false,
        overdue: partial.overdue ?? false,
        archived: partial.archived ?? false,
        subtasks: partial.subtasks ?? [],
        sectionId: partial.sectionId ?? null,
        order: partial.order ?? now,
        createdAt: partial.createdAt ?? now
      });
      return { ...prev, tasks: [...prev.tasks, task] };
    });
  };

  const updateTask = (id: string, partial: Partial<Task>) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? migrateTask({ ...t, ...partial }) : t)
    }));
  };

  const deleteTask = (id: string) => {
    setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
    setSelectedTaskId(prev => prev === id ? null : prev);
  };

  const archiveTask = (id: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, archived: true } : t)
    }));
    setSelectedTaskId(prev => prev === id ? null : prev);
  };

  const addReminder = (taskId: string, at: number) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id !== taskId) return t;
        const reminders = [...(t.reminders ?? []), at].sort((a, b) => a - b);
        return { ...t, reminders };
      })
    }));
  };

  const removeReminder = (taskId: string, at: number) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id !== taskId) return t;
        const reminders = (t.reminders ?? []).filter(r => r !== at);
        return { ...t, reminders };
      })
    }));
  };

  const addAttachment = (taskId: string, attachment: TaskAttachment) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id !== taskId) return t;
        const attachments = [...(t.attachments ?? []), attachment];
        return { ...t, attachments };
      })
    }));
  };

  const removeAttachment = (taskId: string, attachmentId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id !== taskId) return t;
        const attachments = (t.attachments ?? []).filter(a => a.id !== attachmentId);
        return { ...t, attachments };
      })
    }));
  };

  const quickUpdateTaskStatus = (id: string, status: TaskStatus) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => (t.id === id ? { ...t, status } : t))
    }));
  };

  const moveTaskInColumn = (id: string, status: TaskStatus) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => (t.id === id ? { ...t, status, order: Date.now() } : t))
    }));
  };

  const value = useMemo<PomodoroContextValue>(
    () => ({
      config,
      timer,
      tasks,
      lists,
      contexts: DEFAULT_CONTEXTS,
      selectedListId,
      selectedView,
      selectedTaskId,
      searchQuery,
      setSelectedListId,
      setSelectedView,
      setSelectedTaskId,
      setSearchQuery,
      start,
      pause,
      resetCurrentMode,
      skipSession,
      selectTask,
      addTask,
      updateTask,
      deleteTask,
      archiveTask,
      quickUpdateTaskStatus,
      moveTaskInColumn,
      toggleTaskDone,
      addReminder,
      removeReminder,
      addAttachment,
      removeAttachment
    }),
    [config, timer, tasks, lists, selectedListId, selectedView, selectedTaskId, searchQuery]
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
};

export const usePomodoro = (): PomodoroContextValue => {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro must be used within PomodoroProvider');
  return ctx;
};

