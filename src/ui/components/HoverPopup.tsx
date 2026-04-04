/**
 * HoverPopup - Shows LSP hover documentation
 *
 * Displays type information, documentation, and function signatures
 * when hovering over symbols. Uses LspClient.hover() and renders with markdown.
 */

import type { Theme, HoverInfo, CursorPosition } from "../../domain/types.ts"

interface HoverPopupProps {
  theme: Theme
  hoverInfo: HoverInfo
  cursor: CursorPosition
  viewportWidth: number
  viewportHeight: number
  gutterWidth: number
}

export function HoverPopup({
  theme,
  hoverInfo,
  cursor,
  viewportWidth,
  viewportHeight,
  gutterWidth,
}: HoverPopupProps) {
  const { colors } = theme

  if (!hoverInfo.contents) return null

  const content = hoverInfo.contents.trim()
  const lines = content.split("\n")
  const maxLineWidth = Math.max(...lines.map(l => l.length))

  const popupWidth = Math.min(60, Math.max(20, maxLineWidth + 4))
  const popupHeight = Math.min(12, lines.length + 2)

  // Position: prefer below cursor, fallback above
  let top = cursor.line + 2
  if (top + popupHeight > viewportHeight) {
    top = Math.max(0, cursor.line - popupHeight)
  }

  // Position: prefer right of cursor, fallback left
  let left = cursor.column + gutterWidth + 2
  if (left + popupWidth > viewportWidth) {
    left = Math.max(0, viewportWidth - popupWidth - 1)
  }

  return (
    <box
      position="absolute"
      top={top}
      left={left}
      width={popupWidth}
      height={popupHeight}
      backgroundColor={colors.lineHighlight}
      borderStyle="rounded"
      borderColor={colors.border}
      padding={0}
      paddingX={1}
      flexDirection="column"
    >
      <scrollbox height={popupHeight - 2}>
        {lines.map((line, idx) => {
          // Simple code block detection
          if (line.startsWith("```")) return null
          const isCode = lines[0]?.startsWith("```")

          return (
            <text
              key={idx}
              fg={isCode ? colors.foreground : colors.comment}
            >
              {line}
            </text>
          )
        })}
      </scrollbox>
    </box>
  )
}
