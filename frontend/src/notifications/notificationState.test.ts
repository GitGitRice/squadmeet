import { describe, expect, it } from 'vitest'
import type { Notification } from '../api/notifications'
import { notificationsFor } from './notificationState'

const item = { id: 1, read: false } as Notification

describe('Notification state per user (SCRUM-40)', () => {
  it('returns only the current user\'s Notifications', () => {
    expect(notificationsFor({ userId: 1, items: [item] }, 1)).toEqual([item])
    expect(notificationsFor({ userId: 1, items: [item] }, 2)).toEqual([])
    expect(notificationsFor({ userId: 1, items: [item] }, undefined)).toEqual([])
  })
})
