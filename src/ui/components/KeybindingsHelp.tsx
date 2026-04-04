/**
 * KeybindingsHelp Component - Keyboard shortcuts reference
 */

import type { KeyEvent } from "@opentui/core"
import type { Theme } from "../../domain/types.ts"

interface KeybindingsHelpProps {
  theme: Theme
  width: number
  height: number
  onClose: () => void
}

interface ShortcutItem {
  keys: string
  action: string
}

const shortcutItems: ShortcutItem[] = [
  // Search
  { keys: "Ctrl+F", action: "Search in file" },
  { keys: "Ctrl+Shift+F", action: "Search in project (grep)" },
  { keys: "Ctrl+H", action: "Search and replace" },
  // Files
  { keys: "Ctrl+P", action: "Search project files" },
  { keys: "Ctrl+S", action: "Save current file" },
  { keys: "Ctrl+N", action: "New file" },
  { keys: "Ctrl+O", action: "Open file picker" },
  // Navigation
  { keys: "Ctrl+Shift+K", action: "Open command palette" },
  { keys: "Ctrl+B", action: "Toggle file tree" },
  { keys: "Ctrl+Shift+E", action: "Focus explorer" },
  { keys: "Ctrl+Shift+M", action: "Open project picker" },
  { keys: "Ctrl+Tab", action: "Next tab" },
  { keys: "Ctrl+Shift+Tab", action: "Previous tab" },
  // Git
  { keys: "Ctrl+Shift+G", action: "Toggle git panel" },
  { keys: "s (git)", action: "Stage file" },
  { keys: "u (git)", action: "Unstage file" },
  { keys: "S (git)", action: "Stage all" },
  { keys: "c (git)", action: "Focus commit input" },
  { keys: "d (git)", action: "Show file diff" },
  { keys: "p (git)", action: "Push" },
  { keys: "P (git)", action: "Pull" },
  { keys: "1/2/3 (git)", action: "Switch tab: Status/Log/Diff" },
  // Editor modes
  { keys: "Esc", action: "INSERT -> NORMAL / close overlays" },
  { keys: "i / Insert / Enter", action: "NORMAL -> INSERT" },
  { keys: ":", action: "Open command line (NORMAL mode)" },
  { keys: "Arrows", action: "Navigate in NORMAL mode" },
  { keys: "Tab / Shift+Tab", action: "Indent / Outdent (4 spaces)" },
  { keys: "Ctrl+C / Ctrl+X", action: "Copy / Cut selection" },
  { keys: "Ctrl+V", action: "Paste clipboard" },
  { keys: "Ctrl+Z / Ctrl+Shift+Z", action: "Undo / Redo" },
  // Explorer
  { keys: "a (explorer)", action: "Create new file/folder" },
  { keys: "r (explorer)", action: "Rename file/folder" },
  { keys: "d (explorer)", action: "Delete file/folder" },
  // Commands
  { keys: ":blame", action: "Show git blame for file" },
  { keys: ":log", action: "Show git log with graph" },
  { keys: ":diff", action: "Show git diff" },
  // Terminal
  { keys: "Ctrl+`", action: "Open terminal" },
]

export function KeybindingsHelp({ theme, width, height, onClose }: KeybindingsHelpProps) {
  const { colors } = theme
  const leftOffset = Math.floor((100 - width) / 2)
  const topOffset = Math.floor((24 - height) / 2)
  const listHeight = Math.max(1, height - 4)

  const handleKeyDown = (event: KeyEvent) => {
    if (event.name === "escape") {
      event.preventDefault?.()
      onClose()
    }
  }

  return (
    <box
      position="absolute"
      top={topOffset}
      left={leftOffset}
      width={width}
      height={height}
      backgroundColor={colors.background}
      borderStyle="single"
      border={true}
      borderColor={colors.primary}
      flexDirection="column"
      zIndex={220}
    >
      <box height={1} paddingLeft={1} paddingRight={1}>
        <text fg={colors.primary}>
          <b>Keybindings</b>
        </text>
      </box>

      <box height={1}>
        <text fg={colors.border}>{"─".repeat(width - 2)}</text>
      </box>

      <scrollbox flexGrow={1} height={listHeight} focused={true} onKeyDown={handleKeyDown}>
        {shortcutItems.map(item => (
          <ShortcutRow key={item.keys} item={item} theme={theme} />
        ))}
      </scrollbox>

      <box height={1}>
        <text fg={colors.border}>{"─".repeat(width - 2)}</text>
      </box>
      <box height={1} paddingLeft={1}>
        <text fg={colors.comment}>Esc: close</text>
      </box>
    </box>
  )
}

function ShortcutRow({ item, theme }: { item: ShortcutItem; theme: Theme }) {
  const { colors } = theme
  const keyColumnWidth = 21

  return (
    <box
      height={1}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={colors.background}
      flexDirection="row"
    >
      <box width={keyColumnWidth} backgroundColor={colors.background}>
        <text fg={colors.primary} bg={colors.background}>
          {truncate(item.keys, keyColumnWidth - 1)}
        </text>
      </box>
      <box flexGrow={1} backgroundColor={colors.background}>
        <text fg={colors.foreground} bg={colors.background}>
          {item.action}
        </text>
      </box>
    </box>
  )
}

function truncate(input: string, maxLen: number): string {
  if (maxLen <= 1) return ""
  if (input.length <= maxLen) return input
  return `${input.slice(0, Math.max(0, maxLen - 1))}…`
}
