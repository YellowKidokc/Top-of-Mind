// Top of Mind - Numbering System Constants
// These codes are used when posting messages and organizing content

export const SOURCE_CODES = {
  CLIPBOARD: 22001,
  AHK: 22002,
  CODEX: 20040,
  KIMI_CLI: 20030,
} as const;

export const TYPE_CODES = {
  NORMAL_CHAT: 30001,
  RESPONSE: 30002,
  CLIPBOARD_CAPTURE: 32001,
} as const;

export const PRIORITY_CODES = {
  NORMAL: 40003,
  HIGH: 40007,
} as const;

export const WALL_CODES = {
  MAIN: 50001,
  CODE: 50006,
} as const;

export const FOLDER_CODES = {
  INBOX: 60001,
  ACTIVE: 60002,
} as const;

export type SourceCode = typeof SOURCE_CODES[keyof typeof SOURCE_CODES];
export type TypeCode = typeof TYPE_CODES[keyof typeof TYPE_CODES];
export type PriorityCode = typeof PRIORITY_CODES[keyof typeof PRIORITY_CODES];
export type WallCode = typeof WALL_CODES[keyof typeof WALL_CODES];
export type FolderCode = typeof FOLDER_CODES[keyof typeof FOLDER_CODES];
