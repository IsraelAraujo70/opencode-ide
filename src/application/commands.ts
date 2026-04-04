/**
 * Command Registry
 *
 * Registers and executes commands. Commands can be invoked from:
 * - Keybindings
 * - Command Line (:save, :open, etc.)
 * - Command Palette
 */

import type { Command } from "../domain/types.ts"
import { store } from "./store.ts"
import { fileSystem, clipboard, settings, cleanupAndExit } from "../adapters/index.ts"
import { isAbsolute, resolve } from "node:path"

class CommandRegistry {
  private commands: Map<string, Command> = new Map()

  register(command: Command): void {
    this.commands.set(command.id, command)
  }

  get(id: string): Command | undefined {
    return this.commands.get(id)
  }

  getAll(): Command[] {
    return Array.from(this.commands.values())
  }

  async execute(id: string, args?: Record<string, unknown>): Promise<void> {
    const command = this.commands.get(id)
    if (command) {
      await command.execute(args)
    } else {
      console.error(`Command not found: ${id}`)
    }
  }

  /**
   * Parse and execute a command line string (e.g., ":save", ":open path/to/file")
   */
  async executeCommandLine(input: string): Promise<void> {
    const trimmed = input.trim()
    if (!trimmed) return

    // Remove leading : if present
    const line = trimmed.startsWith(":") ? trimmed.slice(1) : trimmed
    const parts = line.split(/\s+/)
    const commandName = parts[0]?.toLowerCase()
    const args = parts.slice(1)

    if (!commandName) return

    // Map command line aliases to command IDs
    const aliasMap: Record<string, string> = {
      // File operations
      save: "file.save",
      w: "file.save",
      write: "file.save",
      open: "file.open",
      e: "file.open",
      edit: "file.open",
      new: "file.new",
      close: "tab.close",
      q: "app.quit",
      quit: "app.quit",
      qa: "app.quitAll",
      wq: "file.saveAndQuit",
      x: "file.saveAndQuit",
      insert: "mode.insert",
      startinsert: "mode.insert",
      normal: "mode.normal",
      stopinsert: "mode.normal",
      xit: "file.saveAndQuit",
      bd: "tab.close",
      bdelete: "tab.close",

      // Navigation
      tabnext: "tab.next",
      tabprev: "tab.prev",
      tabn: "tab.next",
      tabp: "tab.prev",
      bn: "tab.next",
      bp: "tab.prev",
      bnext: "tab.next",
      bprev: "tab.prev",

      // Theme
      theme: "theme.set",
      colorscheme: "theme.set",

      // Terminal
      terminal: "terminal.open",
      term: "terminal.open",

      // OpenCode integration
      opencode: "opencode.open",

      // Project
      project: "project.open",
      cd: "project.open",
      ex: "focus.explorer",
      explore: "focus.explorer",
      tree: "explorer.toggle",
      keys: "keybindings.open",
      keymaps: "keybindings.open",
      keybindings: "keybindings.open",
      files: "filePicker.open",
      find: "filePicker.open",
      fzf: "filePicker.open",
      telescope: "palette.open",
      search: "search.openFile",
      grep: "search.openProject",
      rg: "search.openProject",
      replace: "search.openReplace",
      git: "git.togglePanel",
      gd: "lsp.goToDefinition",
      definition: "lsp.goToDefinition",
      log: "git.showLog",
      blame: "git.blame",
      diff: "git.diff",
      diffview: "git.diffview",
      "DiffviewOpen": "git.diffview",
      "DiffviewClose": "git.closeDiffview",
      "stage-all": "git.stageAll",
    }

    const commandId = aliasMap[commandName]
    if (commandId) {
      await this.execute(commandId, { args })
    } else {
      console.error(`Unknown command: ${commandName}`)
    }
  }
}

export const commandRegistry = new CommandRegistry()

/**
 * Parse and execute a command line string
 * This is a convenience export for the UI
 */
export async function parseAndExecuteCommand(input: string): Promise<void> {
  return commandRegistry.executeCommandLine(input)
}

// ============================================================================
// Register Built-in Commands
// ============================================================================

// File Operations
commandRegistry.register({
  id: "file.save",
  name: "Save File",
  category: "File",
  execute: async () => {
    const state = store.getState()
    const pane = getActivePane(state)
    if (!pane?.activeTabId) return

    const activeTab = pane.tabs.find(t => t.id === pane.activeTabId)
    if (!activeTab) return

    const buffer = state.buffers.get(activeTab.bufferId)
    if (!buffer?.filePath) {
      // TODO: Prompt for file path if untitled
      console.error("Cannot save untitled buffer without path")
      return
    }

    await fileSystem.writeFile(buffer.filePath, buffer.content)
    store.dispatch({ type: "SAVE_FILE", bufferId: buffer.id })
  },
})

commandRegistry.register({
  id: "file.open",
  name: "Open File",
  category: "File",
  execute: async args => {
    const argsArray = (args?.args as string[]) ?? []
    const rawPath = argsArray[0]

    if (!rawPath) {
      // Open file picker when no path provided
      store.dispatch({ type: "OPEN_FILE_PICKER" })
      return
    }

    const state = store.getState()
    const workspaceRoot = state.workspace.rootPath ?? process.cwd()
    const path = isAbsolute(rawPath) ? rawPath : resolve(workspaceRoot, rawPath)

    // Load file content and open
    const exists = await fileSystem.exists(path)
    if (!exists) {
      console.error(`File not found: ${path}`)
      return
    }

    let content = ""
    try {
      content = await fileSystem.readFile(path)
    } catch (error) {
      console.error(`Failed to read file: ${path}`, error)
      return
    }

    store.dispatch({ type: "OPEN_FILE", path, content })
  },
})

commandRegistry.register({
  id: "file.new",
  name: "New File",
  category: "File",
  execute: () => {
    store.dispatch({ type: "NEW_FILE" })
  },
})

commandRegistry.register({
  id: "file.saveAndQuit",
  name: "Save and Quit",
  category: "File",
  execute: async () => {
    await commandRegistry.execute("file.save")
    await commandRegistry.execute("app.quit")
  },
})

// Tab Operations
commandRegistry.register({
  id: "tab.close",
  name: "Close Tab",
  category: "Tab",
  execute: () => {
    const state = store.getState()
    const pane = getActivePane(state)
    if (pane?.activeTabId) {
      store.dispatch({ type: "CLOSE_TAB", tabId: pane.activeTabId })
    }
  },
})

commandRegistry.register({
  id: "tab.next",
  name: "Next Tab",
  category: "Tab",
  execute: () => {
    store.dispatch({ type: "NEXT_TAB" })
  },
})

commandRegistry.register({
  id: "tab.prev",
  name: "Previous Tab",
  category: "Tab",
  execute: () => {
    store.dispatch({ type: "PREV_TAB" })
  },
})

// Theme Operations
commandRegistry.register({
  id: "theme.set",
  name: "Set Theme",
  category: "Theme",
  execute: async args => {
    const argsArray = (args?.args as string[]) ?? []
    const themeName = argsArray[0]

    if (themeName) {
      store.dispatch({ type: "SET_THEME", themeId: themeName })
      await settings.set("theme", themeName)
    } else {
      // Open theme picker if no name provided
      store.dispatch({ type: "OPEN_THEME_PICKER" })
    }
  },
})

commandRegistry.register({
  id: "theme.toggle",
  name: "Toggle Theme",
  category: "Theme",
  execute: () => {
    store.dispatch({ type: "TOGGLE_THEME" })
  },
})

// Terminal Operations
commandRegistry.register({
  id: "terminal.open",
  name: "Open Terminal",
  category: "Terminal",
  execute: () => {
    store.dispatch({ type: "OPEN_TERMINAL" })
  },
})

commandRegistry.register({
  id: "terminal.close",
  name: "Close Terminal",
  category: "Terminal",
  execute: () => {
    const state = store.getState()
    const activeTerminal = Array.from(state.terminals.values()).find(t => t.isActive)
    if (activeTerminal) {
      store.dispatch({ type: "CLOSE_TERMINAL", terminalId: activeTerminal.id })
    }
  },
})

// App Operations
commandRegistry.register({
  id: "app.quit",
  name: "Quit",
  category: "Application",
  execute: async () => {
    // TODO: Check for unsaved changes
    await cleanupAndExit(0)
  },
})

commandRegistry.register({
  id: "app.quitAll",
  name: "Quit All",
  category: "Application",
  execute: async () => {
    // TODO: Check for unsaved changes in all buffers
    await cleanupAndExit(0)
  },
})

// Editor Modes
commandRegistry.register({
  id: "mode.insert",
  name: "Switch to Insert Mode",
  category: "Editor",
  execute: () => {
    store.dispatch({ type: "SET_EDITOR_MODE", mode: "insert" })
    store.dispatch({ type: "SET_FOCUS", target: "editor" })
  },
})

commandRegistry.register({
  id: "mode.normal",
  name: "Switch to Normal Mode",
  category: "Editor",
  execute: () => {
    store.dispatch({ type: "SET_EDITOR_MODE", mode: "normal" })
    store.dispatch({ type: "SET_FOCUS", target: "editor" })
  },
})

// Focus Operations
commandRegistry.register({
  id: "focus.editor",
  name: "Focus Editor",
  category: "Navigation",
  execute: () => {
    store.dispatch({ type: "SET_FOCUS", target: "editor" })
  },
})

commandRegistry.register({
  id: "focus.explorer",
  name: "Focus Explorer",
  category: "Navigation",
  execute: () => {
    const state = store.getState()
    if (!state.explorerVisible) {
      store.dispatch({ type: "TOGGLE_EXPLORER" })
    }
    store.dispatch({ type: "SET_FOCUS", target: "explorer" })
  },
})

commandRegistry.register({
  id: "explorer.toggle",
  name: "Toggle File Tree",
  category: "Navigation",
  execute: () => {
    store.dispatch({ type: "TOGGLE_EXPLORER" })
  },
})

commandRegistry.register({
  id: "focus.terminal",
  name: "Focus Terminal",
  category: "Navigation",
  execute: () => {
    const state = store.getState()
    if (state.terminals.size === 0) {
      store.dispatch({ type: "OPEN_TERMINAL" })
      return
    }

    const activeTerminal = Array.from(state.terminals.values()).find(t => t.isActive)
    if (activeTerminal) {
      store.dispatch({ type: "FOCUS_TERMINAL", terminalId: activeTerminal.id })
    } else {
      const first = state.terminals.values().next().value
      if (first) {
        store.dispatch({ type: "FOCUS_TERMINAL", terminalId: first.id })
      }
    }
  },
})

// Command Line / Palette
commandRegistry.register({
  id: "commandLine.open",
  name: "Open Command Line",
  category: "UI",
  execute: () => {
    store.dispatch({ type: "OPEN_COMMAND_LINE" })
  },
})

commandRegistry.register({
  id: "commandLine.close",
  name: "Close Command Line",
  category: "UI",
  execute: () => {
    store.dispatch({ type: "CLOSE_COMMAND_LINE" })
  },
})

commandRegistry.register({
  id: "palette.open",
  name: "Open Command Palette",
  category: "UI",
  execute: () => {
    store.dispatch({ type: "OPEN_PALETTE" })
  },
})

commandRegistry.register({
  id: "palette.close",
  name: "Close Command Palette",
  category: "UI",
  execute: () => {
    store.dispatch({ type: "CLOSE_PALETTE" })
  },
})

// File Picker
commandRegistry.register({
  id: "filePicker.open",
  name: "Open File Picker",
  category: "UI",
  description: "Open the file browser dialog",
  execute: () => {
    store.dispatch({ type: "OPEN_FILE_PICKER" })
  },
})

commandRegistry.register({
  id: "filePicker.close",
  name: "Close File Picker",
  category: "UI",
  execute: () => {
    store.dispatch({ type: "CLOSE_FILE_PICKER" })
  },
})

// Project Picker
commandRegistry.register({
  id: "project.open",
  name: "Open Project",
  category: "File",
  description: "Open a project folder",
  execute: () => {
    store.dispatch({ type: "OPEN_FILE_PICKER", mode: "project" })
  },
})

// Theme Picker
commandRegistry.register({
  id: "themePicker.open",
  name: "Open Theme Picker",
  category: "UI",
  description: "Open the theme selection dialog",
  execute: () => {
    store.dispatch({ type: "OPEN_THEME_PICKER" })
  },
})

commandRegistry.register({
  id: "themePicker.close",
  name: "Close Theme Picker",
  category: "UI",
  execute: () => {
    store.dispatch({ type: "CLOSE_THEME_PICKER" })
  },
})

// Keybindings Help
commandRegistry.register({
  id: "keybindings.open",
  name: "Show Keybindings",
  category: "Help",
  description: "Open keyboard shortcuts reference",
  execute: () => {
    store.dispatch({ type: "OPEN_KEYBINDINGS_HELP" })
  },
})

commandRegistry.register({
  id: "keybindings.close",
  name: "Close Keybindings",
  category: "Help",
  execute: () => {
    store.dispatch({ type: "CLOSE_KEYBINDINGS_HELP" })
  },
})

// Clipboard Operations
commandRegistry.register({
  id: "clipboard.copy",
  name: "Copy",
  category: "Edit",
  execute: async () => {
    const state = store.getState()
    const pane = getActivePane(state)
    if (!pane?.activeTabId) return

    const activeTab = pane.tabs.find(t => t.id === pane.activeTabId)
    if (!activeTab) return

    const buffer = state.buffers.get(activeTab.bufferId)
    if (!buffer?.selection) return

    // Get selected text
    const { anchor, focus } = buffer.selection
    const start = Math.min(anchor.offset, focus.offset)
    const end = Math.max(anchor.offset, focus.offset)
    const selectedText = buffer.content.slice(start, end)

    await clipboard.writeText(selectedText)
  },
})

commandRegistry.register({
  id: "clipboard.paste",
  name: "Paste",
  category: "Edit",
  execute: async () => {
    const text = await clipboard.readText()
    // TODO: Insert text at cursor position
    console.log("Paste:", text)
  },
})

commandRegistry.register({
  id: "clipboard.cut",
  name: "Cut",
  category: "Edit",
  execute: async () => {
    await commandRegistry.execute("clipboard.copy")
    // TODO: Delete selection
  },
})

commandRegistry.register({
  id: "edit.selectAll",
  name: "Select All",
  category: "Edit",
  execute: () => {
    const state = store.getState()
    const pane = getActivePane(state)
    if (!pane?.activeTabId) return

    const activeTab = pane.tabs.find(t => t.id === pane.activeTabId)
    if (!activeTab) return

    const buffer = state.buffers.get(activeTab.bufferId)
    if (!buffer) return

    const lastLine = buffer.content.split("\n").length - 1
    const lastCol = buffer.content.split("\n")[lastLine]?.length ?? 0

    store.dispatch({
      type: "SET_SELECTION",
      bufferId: buffer.id,
      selection: {
        anchor: { line: 0, column: 0, offset: 0 },
        focus: {
          line: lastLine,
          column: lastCol,
          offset: buffer.content.length,
        },
      },
    })
  },
})

// Search Operations
commandRegistry.register({
  id: "search.openFile",
  name: "Search in File",
  category: "Search",
  description: "Find text in current file (Ctrl+F)",
  execute: () => {
    store.dispatch({ type: "OPEN_SEARCH", mode: "file" })
  },
})

commandRegistry.register({
  id: "search.openProject",
  name: "Search in Project",
  category: "Search",
  description: "Search across all project files (Ctrl+Shift+F)",
  execute: () => {
    store.dispatch({ type: "OPEN_SEARCH", mode: "project" })
  },
})

commandRegistry.register({
  id: "search.openReplace",
  name: "Search and Replace",
  category: "Search",
  description: "Find and replace in current file (Ctrl+H)",
  execute: () => {
    store.dispatch({ type: "OPEN_SEARCH", mode: "file" })
  },
})

commandRegistry.register({
  id: "search.close",
  name: "Close Search",
  category: "Search",
  execute: () => {
    store.dispatch({ type: "CLOSE_SEARCH" })
  },
})

commandRegistry.register({
  id: "search.nextMatch",
  name: "Next Match",
  category: "Search",
  execute: () => {
    store.dispatch({ type: "NEXT_MATCH" })
  },
})

commandRegistry.register({
  id: "search.prevMatch",
  name: "Previous Match",
  category: "Search",
  execute: () => {
    store.dispatch({ type: "PREV_MATCH" })
  },
})

commandRegistry.register({
  id: "search.toggleRegex",
  name: "Toggle Regex Search",
  category: "Search",
  execute: () => {
    store.dispatch({ type: "TOGGLE_SEARCH_REGEX" })
  },
})

commandRegistry.register({
  id: "search.toggleCase",
  name: "Toggle Case Sensitive",
  category: "Search",
  execute: () => {
    store.dispatch({ type: "TOGGLE_SEARCH_CASE" })
  },
})

commandRegistry.register({
  id: "search.toggleWholeWord",
  name: "Toggle Whole Word",
  category: "Search",
  execute: () => {
    store.dispatch({ type: "TOGGLE_SEARCH_WHOLE_WORD" })
  },
})

commandRegistry.register({
  id: "search.replace",
  name: "Replace Current Match",
  category: "Search",
  execute: () => {
    store.dispatch({ type: "REPLACE_MATCH" })
  },
})

commandRegistry.register({
  id: "search.replaceAll",
  name: "Replace All Matches",
  category: "Search",
  execute: () => {
    store.dispatch({ type: "REPLACE_ALL_MATCHES" })
  },
})

// LSP Operations
commandRegistry.register({
  id: "lsp.goToDefinition",
  name: "Go to Definition",
  category: "LSP",
  description: "Jump to symbol definition (gd in normal mode)",
  execute: async () => {
    const state = store.getState()
    const pane = getActivePane(state)
    if (!pane?.activeTabId) return
    const activeTab = pane.tabs.find(t => t.id === pane.activeTabId)
    if (!activeTab) return
    const buffer = state.buffers.get(activeTab.bufferId)
    if (!buffer?.filePath || !buffer.language) return

    const { lsp } = await import("../adapters/index.ts")
    const languageMap: Record<string, string> = {
      typescriptreact: "typescript",
      javascriptreact: "typescript",
      javascript: "typescript",
    }
    const lang = languageMap[buffer.language] ?? buffer.language
    const client = lsp.getClient(lang)
    if (!client?.isReady) return

    const uri = `file://${buffer.filePath}`
    const result = await client.definition(uri, buffer.cursorPosition)
    if (!result) {
      store.dispatch({
        type: "SHOW_NOTIFICATION",
        notification: {
          id: `lsp-def-${Date.now()}`,
          type: "info",
          message: "No definition found",
          timestamp: Date.now(),
        },
      })
      return
    }

    // Open file at definition location
    const filePath = result.uri.replace("file://", "")
    await commandRegistry.execute("file.open", { args: [filePath] })

    // Set cursor to definition position after file opens
    setTimeout(() => {
      const newState = store.getState()
      const newPane = getActivePane(newState)
      if (!newPane?.activeTabId) return
      const newTab = newPane.tabs.find(t => t.id === newPane.activeTabId)
      if (!newTab) return
      store.dispatch({
        type: "SET_CURSOR",
        bufferId: newTab.bufferId,
        position: result.range.start,
      })
    }, 100)
  },
})

// Git Operations
commandRegistry.register({
  id: "git.togglePanel",
  name: "Git Status (Explorer)",
  category: "Git",
  description: "Show git status in explorer (Ctrl+Shift+G)",
  execute: () => {
    const state = store.getState()
    // Switch explorer to Git tab and focus it
    store.dispatch({ type: "SET_EXPLORER_TAB", tab: "git" })
    if (!state.explorerVisible) {
      store.dispatch({ type: "TOGGLE_EXPLORER" })
    }
    store.dispatch({ type: "SET_FOCUS", target: "explorer" })
  },
})

commandRegistry.register({
  id: "git.showLog",
  name: "Git Log",
  category: "Git",
  description: "Show git commit log with graph",
  execute: async () => {
    const state = store.getState()
    const rootPath = state.workspace.rootPath
    if (!rootPath) return

    const { git } = await import("../adapters/index.ts")
    store.dispatch({ type: "SET_GIT_PANEL_TAB", tab: "log" })
    if (!state.gitPanel.isOpen) {
      store.dispatch({ type: "TOGGLE_GIT_PANEL" })
    }

    try {
      const [entries, graph] = await Promise.all([
        git.log(rootPath, 50),
        git.logGraph(rootPath, 50),
      ])
      store.dispatch({ type: "SET_GIT_LOG_ENTRIES", entries })
      store.dispatch({ type: "SET_GIT_LOG_GRAPH", graph })
    } catch (error) {
      console.error("Failed to load git log:", error)
    }
  },
})

commandRegistry.register({
  id: "git.blame",
  name: "Git Blame",
  category: "Git",
  description: "Show blame annotations for current file",
  execute: async () => {
    const state = store.getState()
    const rootPath = state.workspace.rootPath
    if (!rootPath) return

    const pane = getActivePane(state)
    if (!pane?.activeTabId) return
    const activeTab = pane.tabs.find(t => t.id === pane.activeTabId)
    if (!activeTab) return
    const buffer = state.buffers.get(activeTab.bufferId)
    if (!buffer?.filePath) return

    const { git } = await import("../adapters/index.ts")
    try {
      const lines = await git.blame(rootPath, buffer.filePath)
      store.dispatch({ type: "SET_GIT_BLAME_LINES", lines })
      store.dispatch({ type: "SET_GIT_PANEL_TAB", tab: "status" })
      if (!state.gitPanel.isOpen) {
        store.dispatch({ type: "TOGGLE_GIT_PANEL" })
      }
    } catch (error) {
      store.dispatch({
        type: "SHOW_NOTIFICATION",
        notification: {
          id: `blame-error-${Date.now()}`,
          type: "error",
          message: `Blame failed: ${error}`,
          timestamp: Date.now(),
        },
      })
    }
  },
})

commandRegistry.register({
  id: "git.diff",
  name: "Git Diff",
  category: "Git",
  description: "Show diff for selected file",
  execute: async () => {
    const state = store.getState()
    const rootPath = state.workspace.rootPath
    if (!rootPath) return

    const file = state.gitPanel.selectedFile
    const { git } = await import("../adapters/index.ts")
    try {
      const [working, staged] = await Promise.all([
        git.diff(rootPath, file ?? undefined),
        git.diffStaged(rootPath, file ?? undefined),
      ])
      store.dispatch({ type: "SET_GIT_DIFF_CONTENT", content: working })
      store.dispatch({ type: "SET_GIT_STAGED_DIFF_CONTENT", content: staged })
      store.dispatch({ type: "SET_GIT_PANEL_TAB", tab: "diff" })
    } catch (error) {
      console.error("Failed to load diff:", error)
    }
  },
})

commandRegistry.register({
  id: "git.diffview",
  name: "Open Diffview",
  category: "Git",
  description: "Open full-screen diff viewer (like Neovim DiffviewOpen)",
  execute: () => {
    const state = store.getState()
    if (!state.git.isRepo) return
    // Open diffview — the component will load the first file
    store.dispatch({
      type: "OPEN_DIFFVIEW",
      file: "",
      oldCode: "",
      newCode: "",
      language: null,
    })
  },
})

commandRegistry.register({
  id: "git.closeDiffview",
  name: "Close Diffview",
  category: "Git",
  execute: () => {
    store.dispatch({ type: "CLOSE_DIFFVIEW" })
  },
})

commandRegistry.register({
  id: "git.unstageAll",
  name: "Unstage All Changes",
  category: "Git",
  execute: async () => {
    const state = store.getState()
    const rootPath = state.workspace.rootPath
    if (!rootPath) return

    const { git } = await import("../adapters/index.ts")
    const { refreshGitStatus } = await import("./git-runtime.ts")
    const files = state.git.staged.map(f => f.path)
    if (files.length === 0) return
    await git.unstage(rootPath, files)
    refreshGitStatus()
  },
})

commandRegistry.register({
  id: "git.stageAll",
  name: "Stage All Changes",
  category: "Git",
  execute: async () => {
    const state = store.getState()
    const rootPath = state.workspace.rootPath
    if (!rootPath) return

    const { git } = await import("../adapters/index.ts")
    const { refreshGitStatus } = await import("./git-runtime.ts")
    const files = [
      ...state.git.unstaged.map(f => f.path),
      ...state.git.untracked,
    ]
    if (files.length === 0) return
    await git.stage(rootPath, files)
    refreshGitStatus()
  },
})

// OpenCode Integration
commandRegistry.register({
  id: "opencode.open",
  name: "Open OpenCode AI",
  category: "AI",
  description: "Open an OpenCode AI chat instance",
  execute: () => {
    // TODO: Implement OpenCode AI integration
    // This would open a pane with the OpenCode AI chat interface
    console.log("OpenCode AI integration coming soon!")
  },
})

// ============================================================================
// Helpers
// ============================================================================

import type { Pane, PaneNode } from "../domain/types.ts"

function getActivePane(state: ReturnType<typeof store.getState>): Pane | null {
  const findPane = (node: PaneNode): Pane | null => {
    if (node.type === "leaf") {
      return node.pane
    }
    for (const child of node.children) {
      const found = findPane(child)
      if (found) return found
    }
    return null
  }
  return findPane(state.layout.root)
}
