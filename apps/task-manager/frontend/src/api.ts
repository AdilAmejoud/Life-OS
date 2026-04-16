const API_BASE = '/api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: number;
  priority: number;
  labels: string[];
  completed: boolean;
  created_at: number;
  subtasks: { id?: string; title: string; completed: boolean }[];
  recurring_rule?: string;
  updated_at: number;
  project_id?: string;
  section_id?: string;
  status?: string;
}

export async function getTasks(filter?: string): Promise<{ tasks: Task[]; total: number }> {
  const url = `${API_BASE}/tasks${filter ? `?filter=${filter}` : ''}`;
  const res = await fetch(url);
  return await res.json();
}

export async function getTask(id: string): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks/${id}`);
  return await res.json();
}

export async function createTask(data: Partial<Task>): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return await res.json();
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return await res.json();
}

export async function toggleComplete(id: string): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks/${id}/completed`, { method: 'PATCH' });
  return await res.json();
}

export async function deleteTask(id: string): Promise<void> {
  await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
}

export async function getLabels(): Promise<{ id: number; name: string; color: string }[]> {
  const res = await fetch(`${API_BASE}/labels`);
  return await res.json();
}

export async function createLabel(name: string, color: string): Promise<{ id: number; name: string; color: string }> {
  const res = await fetch(`${API_BASE}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  });
  return await res.json();
}

export async function getProjects(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/projects`);
  return await res.json();
}
