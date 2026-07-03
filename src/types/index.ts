// Top of Mind - Core Types

export interface Folder {
  id: string;
  folder_code: number;
  name: string;
  parent_id: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  source_code: number;
  name: string;
  type: 'ai' | 'human' | 'system' | 'bridge';
  status: 'online' | 'offline' | 'paused' | 'muted';
  priority_code: number;
  wall_code: number;
  folder_code: number;
  model?: string;
  description?: string;
  include_in_conversation: boolean;
}

export interface Message {
  id: string;
  content: string;
  source_code: number;
  type_code: number;
  priority_code: number;
  wall_code: number;
  folder_code: number;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  conversation_id?: string;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  title: string;
  folder_id: string | null;
  folder_code: number;
  messages: Message[];
  sources: number[];
  created_at: string;
  updated_at: string;
}

export interface MemoryItem {
  id: string;
  content: string;
  source?: string;
  folder_code?: number;
  tags?: string[];
  embedding_status: 'pending' | 'embedded' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface FileCacheItem {
  id: string;
  path: string;
  name: string;
  type: string;
  folder_code?: number;
  tier?: string;
  owner?: string;
  tags?: string[];
  size?: number;
  modified_at?: string;
}

export interface OperatorAction {
  id?: string;
  action_type: 'write_text' | 'append_text' | 'command' | 'delete' | 'move';
  target_path?: string;
  content?: string;
  review_required: boolean;
  status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
}

export interface RoutingState {
  selectedSources: string[];
  broadcastMode: boolean;
  combineMode: boolean;
}

export interface AppSettings {
  apiBaseUrl: string;
  connectionStatus: 'online' | 'offline';
  syncthingUrl: string;
  syncthingSecretRef: string;
  synologyUrl: string;
  r2Endpoint: string;
  ahkBridgeUrl: string;
}

export type SidebarView =
  | 'chats'
  | 'prompts'
  | 'agents'
  | 'models'
  | 'tools'
  | 'knowledge'
  | 'markdown'
  | 'files'
  | 'operator'
  | 'settings';

export type MainView =
  | 'chat'
  | 'knowledge'
  | 'markdown'
  | 'files'
  | 'operator'
  | 'settings';
