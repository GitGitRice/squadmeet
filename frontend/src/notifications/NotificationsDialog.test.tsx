import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Notification } from '../api/notifications'
import NotificationsDialog from './NotificationsDialog'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const notices: Notification[] = [
  {
    id: 2,
    kind: 'host_handover',
    meetup_id: 12,
    place_id: 4,
    place_name: 'Clara-Zetkin-Park',
    place_address: 'Anton-Bruckner-Allee, 04107 Leipzig',
    created_at: '2026-10-15T08:00:00Z',
    read: false,
  },
  {
    id: 1,
    kind: 'meetup_cancelled',
    meetup_id: 11,
    place_id: 3,
    place_name: 'Friedenspark',
    place_address: 'Linnéstraße, 04103 Leipzig',
    created_at: '2026-10-15T07:00:00Z',
    read: true,
  },
]

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

async function render(fetchMock: ReturnType<typeof vi.fn>, onChanged = vi.fn(), onOpenMeetup = vi.fn()) {
  vi.stubGlobal('fetch', fetchMock)
  const container = document.createElement('div')
  document.body.append(container)
  await act(async () =>
    createRoot(container).render(
      <NotificationsDialog token="tok" onChanged={onChanged} onOpenMeetup={onOpenMeetup} onClose={() => {}} />,
    ),
  )
  return { container, onChanged, onOpenMeetup }
}

describe('NotificationsDialog (SCRUM-40)', () => {
  it('shows the newest Notifications and their read state', async () => {
    const { container } = await render(vi.fn(async () => Response.json(notices)))
    const items = [...container.querySelectorAll('.notification-list button')]

    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining(
        'Du bist jetzt Gastgeber des Treffens bei „Clara-Zetkin-Park“.Anton-Bruckner-Allee, 04107 Leipzig',
      ),
      expect.stringContaining('Das Treffen bei „Friedenspark“ wurde abgesagt.Linnéstraße, 04103 Leipzig'),
    ])
    expect(items[0].classList.contains('unread')).toBe(true)
    expect(items[1].classList.contains('unread')).toBe(false)
  })

  it('marks a Notification as read and opens its Meetup', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(notices))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const { container, onChanged, onOpenMeetup } = await render(fetchMock)

    await act(async () => (container.querySelector('.notification-list button') as HTMLButtonElement).click())

    expect(fetchMock.mock.calls[1][0]).toBe('/api/notifications/2/read')
    expect(onChanged).toHaveBeenLastCalledWith([{ ...notices[0], read: true }, notices[1]])
    expect(onOpenMeetup).toHaveBeenCalledWith(4)
  })

  it('shows an empty state', async () => {
    const { container } = await render(vi.fn(async () => Response.json([])))
    expect(container.textContent).toContain('Noch keine Benachrichtigungen')
  })
})
