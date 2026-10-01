// Served by the hub itself (the start script) -> same origin. Running the
// Vite dev server instead -> the hub on port 8000. VITE_TOP_OF_MIND_API wins.
const API_BASE =
  import.meta.env.VITE_TOP_OF_MIND_API ||
  (window.location.port === '8000' ? window.location.origin : 'http://127.0.0.1:8000');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch { /* not JSON */ }
    throw new Error(detail);
  }
  if (response.status === 204) return null;
  return response.json();
}

const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body || {}) });

export const topOfMindApi = {
  baseUrl: API_BASE,
  getSources: () => request('/top-of-mind/sources'),
  createSource: (source) => post('/top-of-mind/sources', source),

  // Folders & chats — a message lives in exactly one chat, forever
  getFolders: () => request('/folders'),
  createFolder: (name, parentId) => post('/folders', { name, parent_id: parentId || null }),
  getChats: () => request('/chats'),
  createChat: (chat) => post('/chats', chat),
  updateChat: (id, patch) => request(`/chats/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  getChatMessages: (id) => request(`/chats/${id}/messages`),
  sendToChat: (id, message) => post(`/chats/${id}/messages`, message),
  markRead: (id) => post(`/chats/${id}/read`),

  // Invite = link a message into another chat (it never moves or copies)
  invite: (chatId, messageIds) => post(`/chats/${chatId}/links`, { message_ids: messageIds }),
  // Combine = new chat linking the chosen replies + a synthesis
  combine: (payload) => post('/combine', payload),
  // A model's folder: everything it ever wrote
  getModelMessages: (modelId) => request(`/models/${modelId}/messages`),

  updateMessage: (id, patch) => request(`/top-of-mind/messages/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  endAll: () => post('/top-of-mind/controls/end-all'),
  fileActions: (payload) => post('/operator/file-actions', payload),
};
