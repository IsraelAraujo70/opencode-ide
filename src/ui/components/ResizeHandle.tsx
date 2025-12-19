/**
 * ResizeHandle Component - Draggable vertical splitter
 */

import { useRef, useState } from "react"
import type { MouseEvent } from "@opentui/core"
import type { Theme } from "../../domain/types.ts"

interface ResizeHandleProps {
  height: number
  theme: Theme
  explorerWidth: number
  onResize: (nextWidth: number) => void
}

export function ResizeHandle({ height, theme, explorerWidth, onResize }: ResizeHandleProps) {
  const { colors } = theme
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const dragStartX = useRef<number | null>(null)
  const dragStartWidth = useRef(explorerWidth)

  const handleMouseDown = (event: MouseEvent) => {
    event.stopPropagation()
    setIsDragging(true)
    dragStartX.current = event.x
    dragStartWidth.current = explorerWidth
  }

  const handleMouseDrag = (event: MouseEvent) => {
    event.stopPropagation()

    if (!isDragging || dragStartX.current === null) return

    const deltaX = event.x - dragStartX.current
    onResize(dragStartWidth.current + deltaX)
  }

  const endDrag = (event: MouseEvent) => {
    event.stopPropagation()
    setIsDragging(false)
    dragStartX.current = null
  }

  const bg = isDragging || isHovered ? colors.lineHighlight : colors.background
  const fg = isDragging ? colors.primary : isHovered ? colors.primary : colors.border
  const glyph = isDragging ? "║║" : isHovered ? "││" : "  "

  return (
    <box
      width={2}
      height={height}
      backgroundColor={bg}
      onMouseDown={handleMouseDown}
      onMouseDrag={handleMouseDrag}
      onMouseDragEnd={endDrag}
      onMouseUp={endDrag}
      onMouseOver={() => setIsHovered(true)}
      onMouseOut={() => setIsHovered(false)}
    >
      <box flexDirection="column">
        {Array.from({ length: height }, (_, i) => (
          <text key={i} fg={fg} bg={bg}>
            {glyph}
          </text>
        ))}
      </box>
    </box>
  )
}
