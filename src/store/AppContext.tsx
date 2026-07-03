import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { Folder, Message, MemoryItem, FileCacheItem, SidebarView, MainView, AppSettings } from '@/types';
import * as api from '@/lib/api/client';

interface AppState {
  // Navigation
  activeSidebarView: SidebarView;
  mainView: MainView;
  sidebarCollapsed: boolean;
  funnelCollapsed: boolean;
  funnelVisible: boolean;

  // Data
  folders: Folder[];
  messages: Message[];
  sources: unknown[];
  memoryItems: MemoryItem[];
  fileCache: FileCacheItem[];
  activeConversationId: string | null;
  selectedMessageIds: string[];
  selectedSourceIds: string[];

  // Composer
  composerText: string;
  attachedContext: Array<{ type: 'knowledge' | 'file' | 'markdown'; id: string; label: string }>;

  // Settings
  settings: AppSettings;

  // UI State
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'online' | 'offline';
}

type AppAction =
  | { type: 'SET_SIDEBAR_VIEW'; payload: SidebarView }
  | { type: 'SET_MAIN_VIEW'; payload: MainView }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_FUNNEL' }
  | { type: 'SET_FUNNEL_VISIBLE'; payload: boolean }
  | { type: 'SET_FOLDERS'; payload: Folder[] }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_SOURCES'; payload: unknown[] }
  | { type: 'SET_MEMORY_ITEMS'; payload: MemoryItem[] }
  | { type: 'SET_FILE_CACHE'; payload: FileCacheItem[] }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
  | { type: 'TOGGLE_MESSAGE_SELECTION'; payload: string }
  | { type: 'SELECT_ALL_MESSAGES'; payload: string[] }
  | { type: 'CLEAR_MESSAGE_SELECTION' }
  | { type: 'TOGGLE_SOURCE_SELECTION'; payload: string }
  | { type: 'SET_COMPOSER_TEXT'; payload: string }
  | { type: 'ADD_CONTEXT'; payload: { type: 'knowledge' | 'file' | 'markdown'; id: string; label: string } }
  | { type: 'REMOVE_CONTEXT'; payload: string }
  | { type: 'CLEAR_CONTEXT' }
  | { type: 'SET_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'online' | 'offline' };

const initialState: AppState = {
  activeSidebarView: 'chats',
  mainView: 'chat',
  sidebarCollapsed: false,
  funnelCollapsed: true,
  funnelVisible: false,

  folders: [],
  messages: [],
  sources: [],
  memoryItems: [],
  fileCache: [],
  activeConversationId: null,
  selectedMessageIds: [],
  selectedSourceIds: [],

  composerText: '',
  attachedContext: [],

  settings: {
    apiBaseUrl: api.getCurrentBaseUrl(),
    connectionStatus: 'offline',
    syncthingUrl: 'http://127.0.0.1:8384',
    syncthingSecretRef: 'SYNCTHING_API_KEY',
    synologyUrl: '',
    r2Endpoint: '',
    ahkBridgeUrl: '',
  },

  isLoading: false,
  error: null,
  connectionStatus: 'offline',
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SIDEBAR_VIEW':
      return { ...state, activeSidebarView: action.payload };
    case 'SET_MAIN_VIEW':
      return { ...state, mainView: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'TOGGLE_FUNNEL':
      return { ...state, funnelCollapsed: !state.funnelCollapsed };
    case 'SET_FUNNEL_VISIBLE':
      return { ...state, funnelVisible: action.payload };
    case 'SET_FOLDERS':
      return { ...state, folders: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_SOURCES':
      return { ...state, sources: action.payload };
    case 'SET_MEMORY_ITEMS':
      return { ...state, memoryItems: action.payload };
    case 'SET_FILE_CACHE':
      return { ...state, fileCache: action.payload };
    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload };
    case 'TOGGLE_MESSAGE_SELECTION': {
      const ids = state.selectedMessageIds;
      return {
        ...state,
        selectedMessageIds: ids.includes(action.payload)
          ? ids.filter((id) => id !== action.payload)
          : [...ids, action.payload],
      };
    }
    case 'SELECT_ALL_MESSAGES':
      return { ...state, selectedMessageIds: action.payload };
    case 'CLEAR_MESSAGE_SELECTION':
      return { ...state, selectedMessageIds: [] };
    case 'TOGGLE_SOURCE_SELECTION': {
      const ids = state.selectedSourceIds;
      return {
        ...state,
        selectedSourceIds: ids.includes(action.payload)
          ? ids.filter((id) => id !== action.payload)
          : [...ids, action.payload],
      };
    }
    case 'SET_COMPOSER_TEXT':
      return { ...state, composerText: action.payload };
    case 'ADD_CONTEXT':
      return { ...state, attachedContext: [...state.attachedContext, action.payload] };
    case 'REMOVE_CONTEXT':
      return { ...state, attachedContext: state.attachedContext.filter((c) => c.id !== action.payload) };
    case 'CLEAR_CONTEXT':
      return { ...state, attachedContext: [] };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload, settings: { ...state.settings, connectionStatus: action.payload } };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  loadFolders: () => Promise<void>;
  loadMessages: () => Promise<void>;
  loadSources: () => Promise<void>;
  loadMemoryItems: () => Promise<void>;
  loadFileCache: () => Promise<void>;
  sendMessage: (content: string, overrides?: Partial<{ source_code: number; type_code: number; priority_code: number; wall_code: number; folder_code: number }>) => Promise<void>;
  checkConnection: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const loadFolders = useCallback(async () => {
    try {
      const folders = await api.getFolders();
      dispatch({ type: 'SET_FOLDERS', payload: folders });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load folders' });
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const messages = await api.getMessages(75);
      dispatch({ type: 'SET_MESSAGES', payload: messages });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load messages' });
    }
  }, []);

  const loadSources = useCallback(async () => {
    try {
      const sources = await api.getSources();
      dispatch({ type: 'SET_SOURCES', payload: sources });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load sources' });
    }
  }, []);

  const loadMemoryItems = useCallback(async () => {
    try {
      const items = await api.getMemoryItems();
      dispatch({ type: 'SET_MEMORY_ITEMS', payload: items });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load memory items' });
    }
  }, []);

  const loadFileCache = useCallback(async () => {
    try {
      const files = await api.getFileCache();
      dispatch({ type: 'SET_FILE_CACHE', payload: files });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load file cache' });
    }
  }, []);

  const sendMessage = useCallback(async (content: string, overrides = {}) => {
    if (!content.trim()) return;
    try {
      const { SOURCE_CODES, TYPE_CODES, PRIORITY_CODES, WALL_CODES, FOLDER_CODES } = await import('@/lib/numbering/codes');
      const message = await api.postMessage({
        content,
        source_code: SOURCE_CODES.KIMI_CLI,
        type_code: TYPE_CODES.NORMAL_CHAT,
        priority_code: PRIORITY_CODES.NORMAL,
        wall_code: WALL_CODES.MAIN,
        folder_code: FOLDER_CODES.ACTIVE,
        ...overrides,
      });
      dispatch({ type: 'ADD_MESSAGE', payload: message });
      dispatch({ type: 'SET_COMPOSER_TEXT', payload: '' });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
    }
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const ok = await api.testConnection();
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: ok ? 'online' : 'offline' });
    } catch {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'offline' });
    }
  }, []);

  // Load data + auto-check connection on mount
  useEffect(() => {
    checkConnection();
    loadSources();
    loadFolders();
    loadMessages();
    const interval = setInterval(checkConnection, 30000);
    const refresh = setInterval(() => { loadSources(); loadMessages(); }, 4000);
    return () => { clearInterval(interval); clearInterval(refresh); };
  }, [checkConnection, loadSources, loadFolders, loadMessages]);

  const value: AppContextValue = {
    state,
    dispatch,
    loadFolders,
    loadMessages,
    loadSources,
    loadMemoryItems,
    loadFileCache,
    sendMessage,
    checkConnection,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
