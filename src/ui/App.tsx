/**
 * Main App Component - Root layout for OpenCode IDE
 */

import { useTerminalDimensions } from "@opentui/react"
import { useStore } from "./hooks/useStore.ts"
import { StatusBar } from "./components/StatusBar.tsx"
import { TabBar } from "./components/TabBar.tsx"
import { Explorer } from "./components/Explorer.tsx"
import { Editor } from "./components/Editor.tsx"
import { CommandLine } from "./components/CommandLine.tsx"
import { Palette } from "./components/Palette.tsx"
import { useKeybindings } from "./hooks/useKeybindings.ts"
import { parseAndExecuteCommand } from "../application/commands.ts"

export function App() {
  const { width, height } = useTerminalDimensions()
  const [state, dispatch] = useStore()
  
  // Initialize global keybindings
  useKeybindings()
  
  // Calculate layout dimensions
  const explorerWidth = 25
  const statusBarHeight = 1
  const tabBarHeight = 1
  const terminalHeight = state.terminals.size > 0 ? Math.floor((height - statusBarHeight - tabBarHeight) * 0.3) : 0
  const editorHeight = height - statusBarHeight - tabBarHeight - terminalHeight
  const editorWidth = width - explorerWidth
  
  // Get active buffer for the editor
  const activePane = getActivePane(state.layout)
  const activeTab = activePane?.tabs.find(t => t.isActive)
  const activeBuffer = activeTab ? state.buffers.get(activeTab.bufferId) : null
  
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
        theme={state.theme}
        width={width}
      />
      
      {/* Main Content Area */}
      <box flexDirection="row" flexGrow={1}>
        {/* File Explorer */}
        <Explorer
          width={explorerWidth}
          height={editorHeight}
          directoryTree={state.workspace.directoryTree}
          rootPath={state.workspace.rootPath}
          theme={state.theme}
          focused={state.focusTarget === "explorer"}
        />
        
        {/* Editor Area */}
        <box flexDirection="column" flexGrow={1}>
          <Editor
            buffer={activeBuffer}
            theme={state.theme}
            width={editorWidth}
            height={editorHeight}
            focused={state.focusTarget === "editor"}
          />
          
          {/* Terminal Area (when visible) */}
          {state.terminals.size > 0 && (
            <box
              height={terminalHeight}
              backgroundColor={state.theme.colors.background}
              borderStyle="single"
              border={["top"]}
              borderColor={state.theme.colors.border}
            >
              <text fg={state.theme.colors.foreground}>
                Terminal (PTY integration pending)
              </text>
            </box>
          )}
        </box>
      </box>
      
      {/* Status Bar */}
      <StatusBar
        theme={state.theme}
        width={width}
        buffer={activeBuffer}
        focusTarget={state.focusTarget}
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
    </box>
  )
}

// Helper to get the active pane from layout
function getActivePane(layout: import("../domain/types.ts").PaneLayout) {
  const findPane = (node: import("../domain/types.ts").PaneLayout["root"]): import("../domain/types.ts").Pane | null => {
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
