/**
 * ResizeHandle Component - Draggable vertical splitter
 *
 * Uses onMouseDrag/onMouseDragEnd which leverage OpenTUI's
 * capturedRenderable mechanism — all drag events route to this
 * element even when the cursor moves outside it.
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
    event.preventDefault()

    dragStartX.current = event.x
    dragStartWidth.current = explorerWidth
    setIsDragging(true)
  }

  const handleMouseDrag = (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()

    if (!isDragging || dragStartX.current === null) return

    const deltaX = event.x - dragStartX.current
    onResize(dragStartWidth.current + deltaX)
  }

  const handleDragEnd = (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()

    dragStartX.current = null
    setIsDragging(false)
  }

  const backgroundColor = isDragging || isHovered ? colors.lineHighlight : colors.background
  const foregroundColor = isDragging || isHovered ? colors.primary : colors.border
  const glyph = isDragging ? "║" : "│"

  return (
    <box
      width={2}
      height={height}
      backgroundColor={backgroundColor}
      onMouseDown={handleMouseDown}
      onMouseDrag={handleMouseDrag}
      onMouseDragEnd={handleDragEnd}
      onMouseUp={handleDragEnd}
      onMouseOver={() => setIsHovered(true)}
      onMouseOut={() => setIsHovered(false)}
    >
      <box flexDirection="column">
        {Array.from({ length: height }, (_, index) => (
          <text key={index} fg={foregroundColor} bg={backgroundColor} selectable={false}>
            {` ${glyph}`}
          </text>
        ))}
      </box>
    </box>
  )
}
