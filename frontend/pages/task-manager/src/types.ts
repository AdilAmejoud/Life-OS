export type View = 'inbox' | 'today' | 'upcoming' | 'projects' | 'archive' | 'filters';

export interface Project {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  tag: string;
  tagColor: string;
  assignees: string[];
  comments?: number;
  attachments?: number;
  dueDate?: string;
  dueTime?: string;
  progress?: { current: number; total: number };
  image?: string;
  priority?: number;
  category?: 'priority' | 'routine' | 'work' | 'personal' | 'overdue' | 'today';
  completed?: boolean;
  due_date?: number;
  labels?: string[];
  subtasks?: { id?: string; title: string; completed: boolean }[];
  recurring_rule?: string;
  project_id?: string;
  section_id?: string;
  status?: string;
}
