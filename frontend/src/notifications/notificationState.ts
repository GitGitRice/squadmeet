import type { Notification } from '../api/notifications'

// Keep loaded Notifications with their user, so a logout followed by another login never shows
// the previous person's unread count (the same privacy rule as auth/requestCount.ts).
export type NotificationState = { userId: number; items: Notification[] }

export function notificationsFor(
  stored: NotificationState | null,
  userId: number | undefined,
): Notification[] {
  return stored !== null && stored.userId === userId ? stored.items : []
}
