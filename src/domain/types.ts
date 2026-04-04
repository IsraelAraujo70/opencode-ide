/**
 * Domain Types - Core business entities for Open IDE
 * These are pure data structures with no dependencies on infrastructure
 */

// ============================================================================
// Buffer & Editor
// ============================================================================

export interface BufferState {
  id: string
  filePath: string | null // null = untitled/scratch buffer
  content: string
  isDirty: boolean
  language: string | null
  cursorPosition: CursorPosition
  selection: Selection | null
}

export interface CursorPosition {
  line: number
  column: number
  offset: number
}


export interface Selection {
  anchor: CursorPosition
  focus: CursorPosition
}

// ============================================================================
// Tabs & Panes
// ============================================================================

export interface Tab {
  id: string
  bufferId: string
  label: string
  isActive: boolean
  isPinned: boolean
}

export type PaneDirection = "horizontal" | "vertical"

export interface Pane {
  id: string
  type: "editor" | "terminal" | "explorer" | "output"
  tabs: Tab[]
  activeTabId: string | null
  size: number // percentage or flex value
}

export interface PaneLayout {
  root: PaneNode
}

export type PaneNode =
  | { type: "leaf"; pane: Pane }
  | { type: "split"; direction: PaneDirection; children: PaneNode[]; sizes: number[] }

// ============================================================================
// Theme
// ============================================================================

export interface ThemeColors {
  background: string
  foreground: string
  primary: string
  secondary: string
  accent: string
  error: string
  warning: string
  success: string
  info: string
  border: string
  selection: string
  lineHighlight: string
  comment: string
  keyword: string
  string: string
  number: string
  function: string
  variable: string
  type: string
  operator: string
}

export interface Theme {
  id: string
  name: string
  type: "dark" | "light"
  colors: ThemeColors
}

// ============================================================================
// Commands & Keybindings
// ============================================================================

export interface Command {
  id: string
  name: string
  description?: string
  category?: string
  execute: (args?: Record<string, unknown>) => void | Promise<void>
}

export interface Keybinding {
  key: string
  command: string
  when?: string // context condition
  args?: Record<string, unknown>
}

export type ModifierKey = "ctrl" | "shift" | "alt" | "meta" | "super"

export interface KeyCombo {
  key: string
  modifiers: ModifierKey[]
}

// ============================================================================
// File System
// ============================================================================

export interface FileEntry {
  name: string
  path: string
  type: "file" | "directory"
  size?: number
  modifiedAt?: Date
}

export interface DirectoryTree {
  entry: FileEntry
  children: DirectoryTree[]
  isExpanded: boolean
}

// ============================================================================
// Terminal
// ============================================================================

export interface TerminalState {
  id: string
  title: string
  cwd: string
  isActive: boolean
  pid?: number
}

// ============================================================================
// LSP
// ============================================================================

export interface LspServerConfig {
  language: string
  command: string
  args: string[]
  rootUri?: string
}

export interface Diagnostic {
  range: {
    start: CursorPosition
    end: CursorPosition
  }
  severity: "error" | "warning" | "info" | "hint"
  message: string
  source?: string
  code?: string | number
}

export interface CompletionItem {
  label: string
  kind: string
  detail?: string
  documentation?: string
  insertText?: string
  sortText?: string
}

export interface HoverInfo {
  contents: string
  range?: {
    start: CursorPosition
    end: CursorPosition
  }
}

// ============================================================================
// Search
// ============================================================================

export interface SearchMatch {
  line: number
  column: number
  length: number
}

export interface ProjectSearchResult {
  filePath: string
  matches: SearchMatch[]
  preview: string
}

export interface SearchState {
  isOpen: boolean
  mode: "file" | "project"
  query: string
  replaceText: string
  isRegex: boolean
  isCaseSensitive: boolean
  isWholeWord: boolean
  matches: SearchMatch[]
  currentMatchIndex: number
  projectResults: ProjectSearchResult[]
}

// ============================================================================
// Git
// ============================================================================

export type GitFileStatus = "modified" | "added" | "deleted" | "renamed" | "copied" | "untracked"

export interface GitFileChange {
  path: string
  status: GitFileStatus
}

export interface GitLogEntry {
  hash: string
  author: string
  date: string
  message: string
}

export interface GitBlameLine {
  hash: string
  author: string
  date: string
  lineNumber: number
  content: string
}

export type GitPanelTab = "status" | "log" | "diff"

export type GitDiffMode = "working" | "staged"

export interface GitPanelState {
  isOpen: boolean
  activeTab: GitPanelTab
  selectedFile: string | null
  diffContent: string | null
  stagedDiffContent: string | null
  diffMode: GitDiffMode
  logEntries: GitLogEntry[]
  logGraphOutput: string | null
  blameLines: GitBlameLine[]
}

export interface DiffviewState {
  isOpen: boolean
  selectedFile: string | null
  selectedIndex: number
  oldCode: string
  newCode: string
  language: string | null
}

export interface GitState {
  isRepo: boolean
  branch: string
  ahead: number
  behind: number
  staged: GitFileChange[]
  unstaged: GitFileChange[]
  untracked: string[]
  isLoading: boolean
}

// ============================================================================
// Completion
// ============================================================================

export interface CompletionState {
  isOpen: boolean
  items: CompletionItem[]
  selectedIndex: number
  triggerPosition: CursorPosition
}

// ============================================================================
// Notifications
// ============================================================================

export type NotificationType = "info" | "success" | "warning" | "error"

export interface Notification {
  id: string
  type: NotificationType
  message: string
  timestamp: number
}

// ============================================================================
// App State
// ============================================================================

export type FocusTarget = "editor" | "commandLine" | "explorer" | "terminal" | "palette" | "gitPanel"
export type EditorMode = "normal" | "insert"

export interface AppState {
  workspace: {
    rootPath: string | null
    directoryTree: DirectoryTree | null
  }
  buffers: Map<string, BufferState>
  layout: PaneLayout
  explorerWidth: number
  explorerVisible: boolean
  explorerTab: "file" | "bufs" | "git"
  theme: Theme
  focusTarget: FocusTarget
  editorMode: EditorMode
  commandLine: {
    isOpen: boolean
    value: string
  }
  palette: {
    isOpen: boolean
    query: string
    items: PaletteItem[]
  }
  filePicker: {
    isOpen: boolean
    mode: "file" | "project"
  }
  themePicker: {
    isOpen: boolean
  }
  keybindingsHelp: {
    isOpen: boolean
  }
  terminals: Map<string, TerminalState>
  diagnostics: Map<string, Diagnostic[]> // bufferId -> diagnostics
  search: SearchState
  git: GitState
  gitPanel: GitPanelState
  diffview: DiffviewState
  completion: CompletionState
  notifications: Notification[]
}

export interface PaletteItem {
  id: string
  label: string
  description?: string
  icon?: string
  action: () => void | Promise<void>
}

// ============================================================================
// Events / Actions
// ============================================================================

export type AppAction =
  // File operations
  | { type: "OPEN_FILE"; path: string; content?: string }
  | { type: "SAVE_FILE"; bufferId: string }
  | { type: "CLOSE_TAB"; tabId: string }
  | { type: "NEW_FILE" }

  // Editor
  | { type: "SET_BUFFER_CONTENT"; bufferId: string; content: string }
  | { type: "SET_CURSOR"; bufferId: string; position: CursorPosition }
  | { type: "SET_SELECTION"; bufferId: string; selection: Selection | null }
  | { type: "SET_EDITOR_MODE"; mode: EditorMode }

  // Navigation
  | { type: "SET_FOCUS"; target: FocusTarget }
  | { type: "SWITCH_TAB"; tabId: string }
  | { type: "NEXT_TAB" }
  | { type: "PREV_TAB" }

  // Command line
  | { type: "OPEN_COMMAND_LINE" }
  | { type: "CLOSE_COMMAND_LINE" }
  | { type: "SET_COMMAND_LINE_VALUE"; value: string }
  | { type: "EXECUTE_COMMAND"; command: string }

  // Palette
  | { type: "OPEN_PALETTE" }
  | { type: "CLOSE_PALETTE" }
  | { type: "SET_PALETTE_QUERY"; query: string }

  // Theme
  | { type: "SET_THEME"; themeId: string }
  | { type: "TOGGLE_THEME" }

  // Terminal
  | { type: "OPEN_TERMINAL" }
  | { type: "CLOSE_TERMINAL"; terminalId: string }
  | { type: "FOCUS_TERMINAL"; terminalId: string }

  // Workspace
  | { type: "SET_WORKSPACE"; path: string }
  | { type: "SET_DIRECTORY_TREE"; tree: DirectoryTree }
  | { type: "LOAD_DIRECTORY_CHILDREN"; path: string; children: DirectoryTree[] }
  | { type: "REFRESH_TREE" }
  | { type: "TOGGLE_DIRECTORY"; path: string }

  // Panes
  | { type: "SPLIT_PANE"; direction: PaneDirection }
  | { type: "CLOSE_PANE"; paneId: string }
  | { type: "RESIZE_PANE"; paneId: string; size: number }

  // Explorer
  | { type: "SET_EXPLORER_WIDTH"; width: number }
  | { type: "TOGGLE_EXPLORER" }
  | { type: "SET_EXPLORER_TAB"; tab: "file" | "bufs" | "git" }

  // File Picker
  | { type: "OPEN_FILE_PICKER"; mode?: "file" | "project" }
  | { type: "CLOSE_FILE_PICKER" }

  // Project/Workspace
  | { type: "CLOSE_ALL_TABS" }

  // Theme Picker
  | { type: "OPEN_THEME_PICKER" }
  | { type: "CLOSE_THEME_PICKER" }

  // Keybindings Help
  | { type: "OPEN_KEYBINDINGS_HELP" }
  | { type: "CLOSE_KEYBINDINGS_HELP" }

  // Diagnostics
  | { type: "SET_BUFFER_DIAGNOSTICS"; bufferId: string; diagnostics: Diagnostic[] }
  | { type: "CLEAR_BUFFER_DIAGNOSTICS"; bufferId: string }
  | { type: "CLEAR_ALL_DIAGNOSTICS" }

  // Search
  | { type: "OPEN_SEARCH"; mode?: "file" | "project" }
  | { type: "CLOSE_SEARCH" }
  | { type: "SET_SEARCH_QUERY"; query: string }
  | { type: "SET_SEARCH_REPLACE"; replaceText: string }
  | { type: "SET_SEARCH_MATCHES"; matches: SearchMatch[] }
  | { type: "NEXT_MATCH" }
  | { type: "PREV_MATCH" }
  | { type: "TOGGLE_SEARCH_REGEX" }
  | { type: "TOGGLE_SEARCH_CASE" }
  | { type: "TOGGLE_SEARCH_WHOLE_WORD" }
  | { type: "SET_PROJECT_SEARCH_RESULTS"; results: ProjectSearchResult[] }
  | { type: "REPLACE_MATCH" }
  | { type: "REPLACE_ALL_MATCHES" }

  // Git
  | { type: "SET_GIT_STATUS"; git: GitState }
  | { type: "SET_GIT_LOADING"; isLoading: boolean }

  // Git Panel
  | { type: "TOGGLE_GIT_PANEL" }
  | { type: "CLOSE_GIT_PANEL" }
  | { type: "SET_GIT_PANEL_TAB"; tab: GitPanelTab }
  | { type: "SET_GIT_PANEL_SELECTED_FILE"; file: string | null }
  | { type: "SET_GIT_DIFF_CONTENT"; content: string | null }
  | { type: "SET_GIT_LOG_ENTRIES"; entries: GitLogEntry[] }
  | { type: "SET_GIT_BLAME_LINES"; lines: GitBlameLine[] }
  | { type: "SET_GIT_LOG_GRAPH"; graph: string }
  | { type: "SET_GIT_DIFF_MODE"; mode: GitDiffMode }
  | { type: "SET_GIT_STAGED_DIFF_CONTENT"; content: string | null }

  // Diffview (full-screen diff mode)
  | { type: "OPEN_DIFFVIEW"; file: string; oldCode: string; newCode: string; language: string | null }
  | { type: "CLOSE_DIFFVIEW" }
  | { type: "SET_DIFFVIEW_FILE"; file: string; oldCode: string; newCode: string; language: string | null; index: number }

  // Completion
  | { type: "OPEN_COMPLETION"; items: CompletionItem[]; triggerPosition: CursorPosition }
  | { type: "CLOSE_COMPLETION" }
  | { type: "SET_COMPLETION_INDEX"; index: number }

  // Notifications
  | { type: "SHOW_NOTIFICATION"; notification: Notification }
  | { type: "DISMISS_NOTIFICATION"; id: string }
