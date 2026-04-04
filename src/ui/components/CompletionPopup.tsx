/**
 * CompletionPopup - LSP autocomplete dropdown
 *
 * Shows completion suggestions below the cursor position.
 * Triggered by typing in insert mode, uses existing LspClient.completion().
 */

import type { Theme, CompletionItem, CompletionState } from "../../domain/types.ts"
import { store } from "../../application/store.ts"

interface CompletionPopupProps {
  theme: Theme
  completion: CompletionState
  gutterWidth: number
}

const KIND_ICONS: Record<string, string> = {
  text: "  ",
  method: "󰆧 ",
  function: "󰊕 ",
  constructor: " ",
  field: " ",
  variable: "󰀫 ",
  class: " ",
  interface: " ",
  module: " ",
  property: " ",
  unit: " ",
  value: "󰎠 ",
  enum: " ",
  keyword: " ",
  snippet: " ",
  color: " ",
  file: "󰈙 ",
  reference: " ",
  folder: " ",
  "enum-member": " ",
  constant: "󰏿 ",
  struct: " ",
  event: " ",
  operator: "󰆕 ",
  "type-parameter": " ",
}

export function CompletionPopup({ theme, completion, gutterWidth }: CompletionPopupProps) {
  const { colors } = theme
  const { items, selectedIndex, triggerPosition } = completion

  if (!completion.isOpen || items.length === 0) return null

  const popupWidth = Math.min(40, Math.max(20, ...items.map(i => i.label.length + 6)))
  const popupHeight = Math.min(10, items.length)
  const top = triggerPosition.line + 1
  const left = triggerPosition.column + gutterWidth

  return (
    <box
      position="absolute"
      top={top}
      left={left}
      width={popupWidth}
      height={popupHeight}
      backgroundColor={colors.lineHighlight}
      borderStyle="single"
      borderColor={colors.border}
      flexDirection="column"
    >
      <scrollbox height={popupHeight}>
        {items.slice(0, 50).map((item, idx) => {
          const isSelected = idx === selectedIndex
          const kindIcon = KIND_ICONS[item.kind] ?? "  "
          return (
            <box
              key={`${item.label}-${idx}`}
              height={1}
              backgroundColor={isSelected ? colors.selection : colors.lineHighlight}
            >
              <text fg={colors.accent}>{kindIcon}</text>
              <text fg={isSelected ? colors.primary : colors.foreground}>
                {item.label}
              </text>
              {item.detail && (
                <text fg={colors.comment}>{` ${item.detail.slice(0, 20)}`}</text>
              )}
            </box>
          )
        })}
      </scrollbox>
    </box>
  )
}
