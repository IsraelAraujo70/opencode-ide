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
    event.preventDefault()

    setIsDragging(true)
    dragStartX.current = event.x
    dragStartWidth.current = explorerWidth
  }

  const handleMouseDrag = (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()

    if (!isDragging || dragStartX.current === null) return

    const deltaX = event.x - dragStartX.current
    onResize(dragStartWidth.current + deltaX)
  }

  const endDrag = (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()

    setIsDragging(false)
    dragStartX.current = null
  }

  const bg = isDragging || isHovered ? colors.lineHighlight : colors.background
  const borderColor = isDragging || isHovered ? colors.primary : colors.border
  const borderStyle = isDragging ? "double" : "single"

  // Use box borders for drawing so the entire handle
  // is one renderable (better hitbox + avoids text selection).
  return (
    <box
      width={2}
      height={height}
      backgroundColor={bg}
      borderStyle={borderStyle}
      border={["left", "right"]}
      borderColor={borderColor}
      onMouseDown={handleMouseDown}
      onMouseDrag={handleMouseDrag}
      onMouseDragEnd={endDrag}
      onMouseUp={endDrag}
      onMouseOver={() => setIsHovered(true)}
      onMouseOut={() => setIsHovered(false)}
    />
  )
}
