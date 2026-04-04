/**
 * ConfirmDialog - Generic confirmation dialog
 *
 * Used for destructive operations like file deletion and unsaved changes warnings.
 */

import type { Theme } from "../../domain/types.ts"

interface ConfirmDialogProps {
  theme: Theme
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  width?: number
}

export function ConfirmDialog({
  theme,
  title,
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  onConfirm,
  onCancel,
  width: propWidth,
}: ConfirmDialogProps) {
  const colors = theme.colors
  const dialogWidth = propWidth ?? Math.max(30, message.length + 6)

  return (
    <box
      position="absolute"
      top={8}
      left={10}
      width={dialogWidth}
      flexDirection="column"
      backgroundColor={colors.background}
      borderStyle="rounded"
      borderColor={colors.warning}
      padding={1}
      paddingX={2}
    >
      <text fg={colors.warning}>
        <strong>{title}</strong>
      </text>
      <text fg={colors.foreground}>{message}</text>
      <text fg={colors.comment}> </text>
      <box flexDirection="row" gap={2}>
        <text fg={colors.success} bg={colors.selection}>
          {` ${confirmLabel} (y) `}
        </text>
        <text fg={colors.error} bg={colors.selection}>
          {` ${cancelLabel} (n) `}
        </text>
      </box>
    </box>
  )
}
