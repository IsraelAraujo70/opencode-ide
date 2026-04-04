/**
 * Main App Component - Root layout for Open IDE
 */

import { useEffect, useRef } from "react"
import { useTerminalDimensions } from "@opentui/react"
import { useStore } from "./hooks/useStore.ts"
import { StatusBar } from "./components/StatusBar"
import { TabBar } from "./components/TabBar"
import { Explorer } from "./components/Explorer"
import { ResizeHandle } from "./components/ResizeHandle"
import { Editor } from "./components/Editor"
import { CommandLine } from "./components/CommandLine"
import { Palette } from "./components/Palette"
import { FilePicker } from "./components/FilePicker"
import { ThemePicker } from "./components/ThemePicker"
import { KeybindingsHelp } from "./components/KeybindingsHelp"
import { SearchBar } from "./components/SearchBar"
import { SearchPanel } from "./components/SearchPanel"
import { useKeybindings } from "./hooks/useKeybindings.ts"
import { commandRegistry, parseAndExecuteCommand } from "../application/commands.ts"
import { fileSystem, git } from "../adapters/index.ts"
import { setTreeSitterWorkspaceRoot } from "../shared/index.ts"
import { initializeLspRuntime, shutdownLspRuntime } from "../application/lsp-runtime.ts"
import { initializeGitRuntime, shutdownGitRuntime } from "../application/git-runtime.ts"
import { NotificationStack } from "./components/NotificationStack"
import { DiffviewFilePanel } from "./components/DiffviewFilePanel"

export function App() {
  const { width, height } = useTerminalDimensions()
  const [state, dispatch] = useStore()

  // Initialize global keybindings
  useKeybindings()

  useEffect(() => {
    initializeLspRuntime().catch(error => {
      console.error("Failed to initialize LSP runtime:", error)
    })
    initializeGitRuntime().catch(error => {
      console.error("Failed to initialize git runtime:", error)
    })

    return () => {
      shutdownLspRuntime().catch(error => {
        console.error("Failed to shutdown LSP runtime:", error)
      })
      shutdownGitRuntime()
    }
  }, [])

  // Auto-load current directory on startup
  useEffect(() => {
    const loadWorkspace = async () => {
      const cwd = process.cwd()
      dispatch({ type: "SET_WORKSPACE", path: cwd })

      try {
        const tree = await fileSystem.buildTree(cwd, 2)
        dispatch({ type: "SET_DIRECTORY_TREE", tree })
      } catch (error) {
        console.error("Failed to load workspace:", error)
      }
    }

    loadWorkspace()
  }, [])

  useEffect(() => {
    const rootPath = state.workspace.rootPath ?? process.cwd()
    setTreeSitterWorkspaceRoot(rootPath).catch(error => {
      console.error("Failed to configure Tree-sitter workspace:", error)
    })
  }, [state.workspace.rootPath])

  // Calculate layout dimensions
  const resizeHandleWidth = state.explorerVisible ? 2 : 0
  const minExplorerWidth = 8
  const editorMinWidth = 20
  const maxExplorerWidth = Math.max(minExplorerWidth, width - resizeHandleWidth - editorMinWidth)
  const explorerWidth = state.explorerVisible
    ? Math.max(minExplorerWidth, Math.min(maxExplorerWidth, state.explorerWidth))
    : 0

  const statusBarHeight = 1
  const tabBarHeight = 1
  const terminalHeight =
    state.terminals.size > 0 ? Math.floor((height - statusBarHeight - tabBarHeight) * 0.3) : 0
  const editorHeight = height - statusBarHeight - tabBarHeight - terminalHeight
  const editorWidth = Math.max(0, width - explorerWidth - resizeHandleWidth)

  const handleExplorerResize = (nextWidth: number) => {
    const clampedWidth = Math.max(minExplorerWidth, Math.min(maxExplorerWidth, nextWidth))
    dispatch({ type: "SET_EXPLORER_WIDTH", width: clampedWidth })
  }

  // Get active buffer for the editor
  const activePane = getActivePane(state.layout)
  const activeTab = activePane?.tabs.find(t => t.isActive)
  const activeBuffer = activeTab ? (state.buffers.get(activeTab.bufferId) ?? null) : null
  const activeDiagnostics = activeBuffer ? (state.diagnostics.get(activeBuffer.id) ?? []) : []

  // Auto-fetch git blame for active buffer
  const lastBlameFileRef = useRef<string | null>(null)
  useEffect(() => {
    const filePath = activeBuffer?.filePath
    const rootPath = state.workspace.rootPath
    if (!filePath || !rootPath || !state.git.isRepo) {
      if (lastBlameFileRef.current !== null) {
        dispatch({ type: "SET_GIT_BLAME_LINES", lines: [] })
        lastBlameFileRef.current = null
      }
      return
    }

    if (lastBlameFileRef.current === filePath) return
    lastBlameFileRef.current = filePath

    const relativePath = filePath.startsWith(rootPath)
      ? filePath.slice(rootPath.length + 1)
      : filePath

    git.blame(rootPath, relativePath)
      .then(lines => {
        if (lastBlameFileRef.current === filePath) {
          dispatch({ type: "SET_GIT_BLAME_LINES", lines })
        }
      })
      .catch(() => {
        dispatch({ type: "SET_GIT_BLAME_LINES", lines: [] })
      })
  }, [activeBuffer?.filePath, state.workspace.rootPath, state.git.isRepo])

  // Refetch blame after save
  const wasDirtyRef = useRef(false)
  useEffect(() => {
    if (!activeBuffer) return
    if (wasDirtyRef.current && !activeBuffer.isDirty) {
      const filePath = activeBuffer.filePath
      const rootPath = state.workspace.rootPath
      if (filePath && rootPath) {
        const relativePath = filePath.startsWith(rootPath)
          ? filePath.slice(rootPath.length + 1)
          : filePath
        git.blame(rootPath, relativePath)
          .then(lines => dispatch({ type: "SET_GIT_BLAME_LINES", lines }))
          .catch(() => {})
      }
    }
    wasDirtyRef.current = activeBuffer.isDirty
  }, [activeBuffer?.isDirty, activeBuffer?.filePath, state.workspace.rootPath])

  // Full-screen Diffview mode
  if (state.diffview.isOpen) {
    return (
      <box width={width} height={height} flexDirection="column"
        backgroundColor={state.theme.colors.background}>
        <DiffviewFilePanel
          theme={state.theme}
          width={width}
          height={height - 1}
          gitState={state.git}
          diffview={state.diffview}
          rootPath={state.workspace.rootPath}
        />
        <StatusBar
          theme={state.theme}
          width={width}
          buffer={activeBuffer}
          diagnostics={activeDiagnostics}
          focusTarget={state.focusTarget}
          editorMode={state.editorMode}
          gitState={state.git}
        />
      </box>
    )
  }

  return (
    <box
      width={width}
      height={height}
      flexDirection="column"
      backgroundColor={state.theme.colors.background}
    >
      {/* Tab Bar */}
      <TabBar
        tabs={activePane?.tabs ?? []}
        activeTabId={activePane?.activeTabId ?? null}
        diagnostics={state.diagnostics}
        theme={state.theme}
        width={width}
      />

      {/* Main Content Area */}
      <box flexDirection="row" flexGrow={1}>
        {/* File Explorer */}
        {state.explorerVisible && (
          <Explorer
            width={explorerWidth}
            height={editorHeight}
            directoryTree={state.workspace.directoryTree}
            rootPath={state.workspace.rootPath}
            theme={state.theme}
            focused={state.focusTarget === "explorer"}
            buffers={state.buffers}
            gitState={state.git}
            explorerTab={state.explorerTab}
          />
        )}

        {state.explorerVisible && (
          <ResizeHandle
            height={editorHeight}
            theme={state.theme}
            explorerWidth={explorerWidth}
            onResize={handleExplorerResize}
          />
        )}

        {/* Editor Area */}
        <box flexDirection="column" flexGrow={1}>
          <Editor
            buffer={activeBuffer}
            diagnostics={activeDiagnostics}
            theme={state.theme}
            width={editorWidth}
            height={
              state.search.isOpen && state.search.mode === "project"
                ? Math.floor(editorHeight * 0.6)
                : editorHeight
            }
            focused={state.focusTarget === "editor"}
            searchMatches={state.search.matches}
            currentMatchIndex={state.search.currentMatchIndex}
            blameLines={state.gitPanel.blameLines}
          />

          {/* Project Search Results Panel */}
          {state.search.isOpen && state.search.mode === "project" && (
            <SearchPanel
              theme={state.theme}
              width={editorWidth}
              height={Math.floor(editorHeight * 0.4)}
              results={state.search.projectResults}
              query={state.search.query}
              focused={false}
            />
          )}

          {/* Terminal Area (when visible) */}
          {state.terminals.size > 0 && (
            <box
              height={terminalHeight}
              backgroundColor={state.theme.colors.background}
              borderStyle="single"
              border={["top"]}
              borderColor={state.theme.colors.border}
            >
              <text fg={state.theme.colors.foreground}>Terminal (PTY integration pending)</text>
            </box>
          )}
        </box>

      </box>

      {/* Status Bar */}
      <StatusBar
        theme={state.theme}
        width={width}
        buffer={activeBuffer}
        diagnostics={activeDiagnostics}
        focusTarget={state.focusTarget}
        editorMode={state.editorMode}
        gitState={state.git}
      />

      {/* Command Line Overlay */}
      {state.commandLine.isOpen && (
        <CommandLine
          value={state.commandLine.value}
          theme={state.theme}
          width={width}
          onSubmit={(cmd: string) => {
            parseAndExecuteCommand(cmd)
            dispatch({ type: "CLOSE_COMMAND_LINE" })
          }}
          onCancel={() => dispatch({ type: "CLOSE_COMMAND_LINE" })}
          onChange={(value: string) => dispatch({ type: "SET_COMMAND_LINE_VALUE", value })}
        />
      )}

      {/* Command Palette Overlay */}
      {state.palette.isOpen && (
        <Palette
          query={state.palette.query}
          items={state.palette.items}
          theme={state.theme}
          width={Math.min(60, width - 4)}
          height={Math.min(20, height - 4)}
          onClose={() => dispatch({ type: "CLOSE_PALETTE" })}
          onQueryChange={(query: string) => dispatch({ type: "SET_PALETTE_QUERY", query })}
        />
      )}

      {/* File Picker Overlay */}
      {state.filePicker.isOpen && (
        <FilePicker
          theme={state.theme}
          width={
            state.filePicker.mode === "file" ? Math.min(120, width - 2) : Math.min(60, width - 4)
          }
          height={
            state.filePicker.mode === "file" ? Math.min(28, height - 2) : Math.min(20, height - 4)
          }
          initialPath={state.workspace.rootPath || process.cwd()}
          mode={state.filePicker.mode}
          onSelect={async (path: string) => {
            dispatch({ type: "CLOSE_FILE_PICKER" })
            if (state.filePicker.mode === "project") {
              // Close all tabs and switch workspace
              dispatch({ type: "CLOSE_ALL_TABS" })
              dispatch({ type: "SET_WORKSPACE", path })
              // Reload directory tree
              try {
                const tree = await fileSystem.buildTree(path, 2)
                dispatch({ type: "SET_DIRECTORY_TREE", tree })
              } catch (error) {
                console.error("Failed to load workspace:", error)
              }
            } else {
              void commandRegistry.execute("file.open", { args: [path] })
            }
          }}
          onCancel={() => dispatch({ type: "CLOSE_FILE_PICKER" })}
        />
      )}

      {/* Theme Picker Overlay */}
      {state.themePicker.isOpen && (
        <ThemePicker
          currentTheme={state.theme}
          width={Math.min(50, width - 4)}
          height={Math.min(16, height - 4)}
          onSelect={(themeId: string) => {
            dispatch({ type: "CLOSE_THEME_PICKER" })
            dispatch({ type: "SET_THEME", themeId })
          }}
          onCancel={() => dispatch({ type: "CLOSE_THEME_PICKER" })}
        />
      )}

      {/* Keybindings Help Overlay */}
      {state.keybindingsHelp.isOpen && (
        <KeybindingsHelp
          theme={state.theme}
          width={Math.min(76, width - 4)}
          height={Math.min(20, height - 4)}
          onClose={() => dispatch({ type: "CLOSE_KEYBINDINGS_HELP" })}
        />
      )}

      {/* Search Bar Overlay - positioned at bottom like vim */}
      {state.search.isOpen && (
        <box position="absolute" bottom={1} left={0} width={width} zIndex={90}>
          <SearchBar
            theme={state.theme}
            width={width}
            query={state.search.query}
            replaceText={state.search.replaceText}
            isRegex={state.search.isRegex}
            isCaseSensitive={state.search.isCaseSensitive}
            isWholeWord={state.search.isWholeWord}
            matches={state.search.matches}
            currentMatchIndex={state.search.currentMatchIndex}
            mode={state.search.mode}
            bufferContent={activeBuffer?.content ?? null}
          />
        </box>
      )}

      {/* Notifications */}
      {state.notifications.length > 0 && (
        <NotificationStack
          theme={state.theme}
          notifications={state.notifications}
          width={width}
          height={height}
        />
      )}
    </box>
  )
}

// Helper to get the active pane from layout
function getActivePane(layout: import("../domain/types.ts").PaneLayout) {
  const findPane = (
    node: import("../domain/types.ts").PaneLayout["root"]
  ): import("../domain/types.ts").Pane | null => {
    if (node.type === "leaf") {
      return node.pane
    }
    for (const child of node.children) {
      const found = findPane(child)
      if (found) return found
    }
    return null
  }
  return findPane(layout.root)
}
