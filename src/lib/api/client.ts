// Top of Mind - API Client
// Base URL is configurable via env or localStorage

import type { Folder, Message, MemoryItem, FileCacheItem, OperatorAction } from '@/types';

function getBaseUrl(): string {
  // Vite env var takes precedence
  if (import.meta.env.VITE_TOP_OF_MIND_API) {
    return import.meta.env.VITE_TOP_OF_MIND_API;
  }
  // localStorage for runtime override
  const stored = localStorage.getItem('top-of-mind-api-url');
  if (stored) return stored;
  // Default
  return 'http://127.0.0.1:10000';
}

export function setBaseUrl(url: string): void {
  localStorage.setItem('top-of-mind-api-url', url);
}

export function getCurrentBaseUrl(): string {
  return getBaseUrl();
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`API ${response.status}: ${text}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as T;
}

// ===== FOLDERS =====
export async function getFolders(): Promise<Folder[]> {
  const d = await fetchApi<any>('/folders');
  return Array.isArray(d) ? d : (d?.folders ?? []);
}

export async function createFolder(data: { name: string; parent_id?: string | null }): Promise<Folder> {
  return fetchApi<Folder>('/folders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getFolder(folderId: string): Promise<Folder> {
  return fetchApi<Folder>(`/folders/${folderId}`);
}

export async function archiveFolder(folderId: string): Promise<void> {
  return fetchApi<void>(`/folders/${folderId}/archive`, {
    method: 'PATCH',
  });
}

// ===== TOP OF MIND MESSAGES =====
export async function getSources(): Promise<unknown[]> {
  const d = await fetchApi<any>('/top-of-mind/sources');
  const list = Array.isArray(d) ? d : (d?.sources ?? []);
  return list.map((s: any) => ({
    ...s,
    id: s.id ?? s.source_id,
    name: s.name ?? s.label ?? s.source_id,
    status: s.status ?? 'online',
  }));
}

export async function createSource(data: Record<string, unknown>): Promise<unknown> {
  return fetchApi<unknown>('/top-of-mind/sources', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMessages(limit = 75): Promise<Message[]> {
  const d = await fetchApi<any>(`/top-of-mind/messages?limit=${limit}`);
  const list = Array.isArray(d) ? d : (d?.messages ?? []);
  // Normalize hub shape (body/source_label) to what the UI reads (content/source).
  return list.map((m: any) => ({
    ...m,
    id: m.id ?? m.message_id,
    content: m.content ?? m.body ?? '',
    source: m.source ?? m.source_label ?? m.source_id ?? 'source',
  }));
}

export async function postMessage(data: {
  source_id?: string;
  source_label?: string;
  body?: string;
  content: string;
  source_code: number;
  type_code: number;
  priority_code: number;
  wall_code: number;
  folder_code: number;
  role?: string;
  wall?: string;
  folder?: string;
  parent_id?: string;
  conversation_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<Message> {
  const payload = {
    source_id: data.source_id ?? 'desk',
    source_label: data.source_label ?? 'Top of Mind Desk',
    body: data.body ?? data.content,
    source_code: data.source_code,
    type_code: data.type_code,
    role: data.role ?? 'user',
    priority_code: data.priority_code,
    wall: data.wall ?? 'main',
    wall_code: data.wall_code,
    folder: data.folder ?? 'Main',
    folder_code: data.folder_code,
    pinned: false,
    metadata: data.metadata ?? {},
  };
  const d = await fetchApi<any>('/top-of-mind/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const m = d?.message ?? d;
  return {
    ...m,
    id: m.id ?? m.message_id,
    content: m.content ?? m.body ?? '',
    source: m.source ?? m.source_label ?? m.source_id ?? 'source',
  };
}

export async function updateMessage(messageId: string, data: Partial<Message>): Promise<Message> {
  return fetchApi<Message>(`/top-of-mind/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function combineMessages(data: { message_ids: string[] }): Promise<unknown> {
  return fetchApi<unknown>('/top-of-mind/combine', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function endAllConversations(): Promise<void> {
  return fetchApi<void>('/top-of-mind/controls/end-all', {
    method: 'POST',
  });
}

// ===== KNOWLEDGE BANK (MEMORY) =====
export async function searchMemory(q: string, mode?: 'vector'): Promise<MemoryItem[]> {
  const path = mode ? `/memory/search?q=${encodeURIComponent(q)}&mode=${mode}` : `/memory/search?q=${encodeURIComponent(q)}`;
  return fetchApi<MemoryItem[]>(path);
}

export async function getMemoryItems(): Promise<MemoryItem[]> {
  return fetchApi<MemoryItem[]>('/memory/items');
}

export async function createMemoryItem(data: {
  content: string;
  source?: string;
  folder_code?: number;
  tags?: string[];
}): Promise<MemoryItem> {
  return fetchApi<MemoryItem>('/memory/items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function embedPending(): Promise<void> {
  return fetchApi<void>('/memory/embed-pending', {
    method: 'POST',
  });
}

// ===== FILE CACHE =====
export async function getFileCache(): Promise<FileCacheItem[]> {
  return fetchApi<FileCacheItem[]>('/files/cache');
}

export async function searchFileCache(q: string): Promise<FileCacheItem[]> {
  return fetchApi<FileCacheItem[]>(`/files/cache/search?q=${encodeURIComponent(q)}`);
}

export async function getFileByPath(path: string): Promise<FileCacheItem> {
  return fetchApi<FileCacheItem>(`/files/cache/by-path?path=${encodeURIComponent(path)}`);
}

export async function addFileToCache(data: { path: string; name: string; type: string }): Promise<FileCacheItem> {
  return fetchApi<FileCacheItem>('/files/cache', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ===== OPERATOR ACTIONS =====
export async function postFileAction(action: OperatorAction): Promise<unknown> {
  return fetchApi<unknown>('/operator/file-actions', {
    method: 'POST',
    body: JSON.stringify(action),
  });
}

export async function postOperatorCommand(command: { command: string; args?: string[] }): Promise<unknown> {
  return fetchApi<unknown>('/operator/commands', {
    method: 'POST',
    body: JSON.stringify(command),
  });
}

// ===== HEALTH / CONNECTION TEST =====
export async function testConnection(): Promise<boolean> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/jobs/stats`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
