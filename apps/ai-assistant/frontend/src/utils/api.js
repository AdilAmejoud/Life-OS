// ─── Core fetch wrapper ───────────────────────────────────────────────────────
async function fetchApi(endpoint, options = {}) {
  const res = await fetch(endpoint, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    let message = res.statusText;
    try { const body = await res.json(); message = body.message || body.error || message; } catch (_) { }
    throw new Error(message);
  }
  return res.json();
}

// ─── Health ───────────────────────────────────────────────────────────────────
export async function getHealth() { return fetchApi('/health'); }

// ─── Models ───────────────────────────────────────────────────────────────────
export async function getModels() { return fetchApi('/api/models'); }
export async function switchModel(model) {
  return fetchApi('/api/models/switch', { method: 'POST', body: JSON.stringify({ model }) });
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export async function sendChat(body) {
  return fetchApi('/api/chat', { method: 'POST', body: JSON.stringify(body) });
}

/** Returns raw Response for SSE reading. Accepts optional AbortSignal. */
export async function sendChatStream(body, signal) {
  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let message = res.statusText;
    try { const d = await res.json(); message = d.message || message; } catch (_) { }
    throw new Error(message);
  }
  return res;
}

// ─── Conversations ────────────────────────────────────────────────────────────
export async function getConversations() { return fetchApi('/api/conversations'); }
export async function getConversation(id) { return fetchApi(`/api/conversations/${id}`); }
export async function createConversation(body) {
  return fetchApi('/api/conversations', { method: 'POST', body: JSON.stringify(body) });
}
export async function deleteConversation(id) {
  return fetchApi(`/api/conversations/${id}`, { method: 'DELETE' });
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export async function getTasks(status = '') {
  const q = status ? `?status=${status}` : '';
  return fetchApi(`/api/tasks${q}`);
}
export async function createTask(body) {
  return fetchApi('/api/tasks', { method: 'POST', body: JSON.stringify(body) });
}
export async function updateTask(id, body) {
  return fetchApi(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}
export async function deleteTask(id) {
  return fetchApi(`/api/tasks/${id}`, { method: 'DELETE' });
}

// ─── Memory ───────────────────────────────────────────────────────────────────
export async function getMemory(type = '') {
  const q = type ? `?type=${type}` : '';
  return fetchApi(`/api/memory${q}`);
}
export async function storeMemory(body) {
  return fetchApi('/api/memory', { method: 'POST', body: JSON.stringify(body) });
}

// ─── User Data ────────────────────────────────────────────────────────────────
export async function getUserData(category = '') {
  const q = category ? `?category=${category}` : '';
  return fetchApi(`/api/user-data${q}`);
}
export async function storeUserData(body) {
  return fetchApi('/api/user-data', { method: 'POST', body: JSON.stringify(body) });
}

// ─── Skills ───────────────────────────────────────────────────────────────────
export async function getSkills() { return fetchApi('/api/skills'); }
export async function createSkill(body) {
  return fetchApi('/api/skills', { method: 'POST', body: JSON.stringify(body) });
}
export async function deleteSkill(id) {
  return fetchApi(`/api/skills/${id}`, { method: 'DELETE' });
}
export async function executeSkill(id, body) {
  return fetchApi(`/api/skills/${id}/execute`, { method: 'POST', body: JSON.stringify(body) });
}

// ─── Instructions ─────────────────────────────────────────────────────────────
export async function getInstructions() { return fetchApi('/api/instructions'); }

// ─── Tools ────────────────────────────────────────────────────────────────────
export async function getTools() { return fetchApi('/api/tools'); }
export async function executeTool(name, action, params = {}) {
  return fetchApi('/api/tools/execute', { method: 'POST', body: JSON.stringify({ name, action, params }) });
}

// ─── Credentials ──────────────────────────────────────────────────────────────
export async function getCredentials(service) {
  const q = service ? `?service=${encodeURIComponent(service)}` : '';
  return fetchApi(`/api/credentials${q}`);
}
export async function saveCredential(body) {
  return fetchApi('/api/credentials', { method: 'POST', body: JSON.stringify(body) });
}
export async function deleteCredential(service, keyName) {
  return fetchApi(`/api/credentials/${encodeURIComponent(service)}/${encodeURIComponent(keyName)}`, { method: 'DELETE' });
}

// ─── n8n Workflows ────────────────────────────────────────────────────────────
export async function getN8nWorkflows() { return fetchApi('/api/n8n/workflows'); }
export async function triggerWorkflow(workflowId, payload = {}) {
  return fetchApi(`/api/n8n/trigger/${workflowId}`, { method: 'POST', body: JSON.stringify({ payload }) });
}
export async function getConnectedWorkflows() { return fetchApi('/api/n8n/connected'); }
export async function connectWorkflow(body) {
  return fetchApi('/api/n8n/connect', { method: 'POST', body: JSON.stringify(body) });
}
export async function disconnectWorkflow(workflowId) {
  return fetchApi(`/api/n8n/disconnect/${workflowId}`, { method: 'DELETE' });
}

// ─── Web Search ───────────────────────────────────────────────────────────────
export async function webSearch(q) { return fetchApi(`/api/search?q=${encodeURIComponent(q)}`); }

// ─── Reasoning ────────────────────────────────────────────────────────────────
export async function buildReasoning(body) {
  return fetchApi('/api/reasoning', { method: 'POST', body: JSON.stringify(body) });
}
