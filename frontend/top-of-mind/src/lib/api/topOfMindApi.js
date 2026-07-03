const API_BASE = import.meta.env.VITE_TOP_OF_MIND_API || 'http://127.0.0.1:8000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  if (response.status === 204) return null;
  return response.json();
}

export const topOfMindApi = {
  baseUrl: API_BASE,
  getSources: () => request('/top-of-mind/sources'),
  createSource: (source) => request('/top-of-mind/sources', { method: 'POST', body: JSON.stringify(source) }),
  getMessages: (limit = 75) => request(`/top-of-mind/messages?limit=${limit}`),
  createMessage: (message) => request('/top-of-mind/messages', { method: 'POST', body: JSON.stringify(message) }),
  updateMessage: (id, patch) => request(`/top-of-mind/messages/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  combine: (payload) => request('/top-of-mind/combine', { method: 'POST', body: JSON.stringify(payload || {}) }),
  endAll: () => request('/top-of-mind/controls/end-all', { method: 'POST', body: JSON.stringify({}) }),
  fileActions: (payload) => request('/operator/file-actions', { method: 'POST', body: JSON.stringify(payload) }),
};
