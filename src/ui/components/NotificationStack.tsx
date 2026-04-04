/**
 * NotificationStack - Toast notifications in the bottom-right corner
 *
 * Auto-dismiss after 3 seconds with animation.
 */

import { useEffect } from "react"
import type { Theme, Notification } from "../../domain/types.ts"
import { store } from "../../application/store.ts"

interface NotificationStackProps {
  theme: Theme
  notifications: Notification[]
  width: number
  height: number
}

const TYPE_COLORS: Record<string, (colors: Theme["colors"]) => string> = {
  info: (c) => c.info,
  success: (c) => c.success,
  warning: (c) => c.warning,
  error: (c) => c.error,
}

const TYPE_ICONS: Record<string, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✗",
}

export function NotificationStack({ theme, notifications, width, height }: NotificationStackProps) {
  const colors = theme.colors

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (notifications.length === 0) return

    const timers = notifications.map((n) => {
      const age = Date.now() - n.timestamp
      const remaining = Math.max(0, 3000 - age)
      return setTimeout(() => {
        store.dispatch({ type: "DISMISS_NOTIFICATION", id: n.id })
      }, remaining)
    })

    return () => timers.forEach(clearTimeout)
  }, [notifications])

  if (notifications.length === 0) return null

  const notifWidth = Math.min(40, width - 4)
  const visibleNotifs = notifications.slice(-5) // Show max 5

  return (
    <box
      position="absolute"
      bottom={2}
      right={1}
      width={notifWidth}
      flexDirection="column"
      gap={0}
    >
      {visibleNotifs.map((notif) => {
        const color = TYPE_COLORS[notif.type]?.(colors) ?? colors.foreground
        const icon = TYPE_ICONS[notif.type] ?? ""

        return (
          <box
            key={notif.id}
            height={1}
            backgroundColor={colors.lineHighlight}
            borderStyle="rounded"
            borderColor={color}
            paddingX={1}
          >
            <text fg={color}>{`${icon} `}</text>
            <text fg={colors.foreground}>{notif.message.slice(0, notifWidth - 6)}</text>
          </box>
        )
      })}
    </box>
  )
}
