/**
 * Editor Component - Main text editing area
 * 
 * Uses OpenTUI's textarea component which has built-in:
 * - Cursor movement
 * - Text selection
 * - Undo/redo
 * - Mouse support
 */

import type { BufferState, Theme } from "../../domain/types.ts"
import { store } from "../../application/store.ts"

interface EditorProps {
  buffer: BufferState | null
  theme: Theme
  width: number
  height: number
  focused: boolean
}

export function Editor({ buffer, theme, width, height, focused }: EditorProps) {
  const { colors } = theme
  
  if (!buffer) {
    return (
      <box
        width={width}
        height={height}
        backgroundColor={colors.background}
        justifyContent="center"
        alignItems="center"
      >
        <box flexDirection="column" alignItems="center">
          <text fg={colors.comment}>
            <b>OpenCode IDE</b>
          </text>
          <text fg={colors.comment}>
            {" "}
          </text>
          <text fg={colors.comment}>
            Press Ctrl+N to create a new file
          </text>
          <text fg={colors.comment}>
            Press Ctrl+P to open command palette
          </text>
          <text fg={colors.comment}>
            Type :open &lt;path&gt; to open a file
          </text>
        </box>
      </box>
    )
  }
  
  return (
    <box
      width={width}
      height={height}
      backgroundColor={colors.background}
      flexDirection="row"
    >
      {/* Line numbers */}
      <LineNumbers
        content={buffer.content}
        theme={theme}
        height={height}
        currentLine={buffer.cursorPosition.line}
      />
      
      {/* Editor textarea */}
      <textarea
        flexGrow={1}
        height={height}
        initialValue={buffer.content}
        focused={focused}
        backgroundColor={colors.background}
        textColor={colors.foreground}
        cursorColor={colors.primary}
      />
    </box>
  )
}

interface LineNumbersProps {
  content: string
  theme: Theme
  height: number
  currentLine: number
}

function LineNumbers({ content, theme, height, currentLine }: LineNumbersProps) {
  const { colors } = theme
  const lines = content.split("\n")
  const lineCount = lines.length
  const gutterWidth = Math.max(3, String(lineCount).length + 1)
  
  // Generate line numbers for visible area
  const visibleLines = Math.min(lineCount, height)
  const lineNumbers: string[] = []
  
  for (let i = 0; i < visibleLines; i++) {
    const lineNum = i + 1
    lineNumbers.push(String(lineNum).padStart(gutterWidth - 1, " ") + " ")
  }
  
  return (
    <box
      width={gutterWidth}
      height={height}
      backgroundColor={colors.background}
      flexDirection="column"
    >
      {lineNumbers.map((num, i) => (
        <text
          key={i}
          fg={i === currentLine ? colors.foreground : colors.comment}
          bg={i === currentLine ? colors.lineHighlight : colors.background}
        >
          {num}
        </text>
      ))}
    </box>
  )
}
