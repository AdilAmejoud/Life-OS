export type TimerMode = 'work' | 'shortBreak' | 'longBreak';

export type TaskStatus = 'todo' | 'doing' | 'later' | 'done';

export type Priority = 'low' | 'medium' | 'high';

export type ViewId =
  | 'inbox'
  | 'today'
  | 'upcoming'
  | 'agenda'
  | 'board'
  | 'projects'
  | 'contexts'
  | 'nextActions'
  | 'waitingFor'
  | 'somedayMaybe'
  | 'calendar'
  | 'review'
  | 'tutorial'
  | 'done'
  | 'archived';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskAttachment {
  id: string;
  type: 'file' | 'link';
  name: string;
  url?: string;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  listId: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  dueDate?: string | null;
  dueTime?: string | null;
  startDate?: string | null;
  startTime?: string | null;
  priority: Priority;
  tags?: string[];
  notes?: string;
  description?: string;
  about?: string;
  contexts?: string[];
  blockedBy?: string[];
  reminders?: number[];
  attachments?: TaskAttachment[];
  markdownNotes?: boolean;
  overdue?: boolean;
  archived?: boolean;
  subtasks?: Subtask[];
  sectionId?: string | null;
  order: number;
  createdAt: number;
}

export interface List {
  id: string;
  name: string;
  sections?: Section[];
}

export interface Section {
  id: string;
  listId: string;
  name: string;
  order: number;
}

export interface Context {
  id: string;
  name: string;
}

export interface TimerConfig {
  work: number;
  shortBreak: number;
  longBreak: number;
  longBreakAfter: number;
  autoStartBreaks: boolean;
  enableSound: boolean;
}

export interface TimerState {
  mode: TimerMode;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  pomodoros: number;
  sessions: number;
  currentTaskId?: string | null;
}

