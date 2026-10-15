// In-app Notifications about Meetup events (SCRUM-40).

import { answer } from './http'

export type NotificationKind =
  | 'meetup_cancelled'
  | 'meetup_ended'
  | 'host_handover'
  | 'blocked_user_joined'

export type Notification = {
  id: number
  kind: NotificationKind
  meetup_id: number
  place_id: number
  place_name: string
  place_address: string | null
  created_at: string
  read: boolean
}

export async function fetchNotifications(token: string): Promise<Notification[]> {
  return answer(
    await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } }),
    'GET notifications',
  )
}

export async function markNotificationRead(token: string, notificationId: number): Promise<void> {
  const response = await fetch(`/api/notifications/${notificationId}/read`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) await answer(response, 'POST notification read')
}
