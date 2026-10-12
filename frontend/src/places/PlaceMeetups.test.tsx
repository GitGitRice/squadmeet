import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { User } from '../api/auth'
import PlaceMeetups from './PlaceMeetups'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const paula: User = { id: 1, nickname: 'Paula', avatar: 'fox', mfa_enabled: false, is_admin: false }
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()

// Running now.
const meetup = {
  id: 7,
  place_id: 3,
  host: { id: 1, nickname: 'Paula', avatar: 'fox' },
  party_size: 3,
  starts_at: hoursFromNow(-1),
  ends_at: hoursFromNow(1),
}

// Starts tomorrow (SCRUM-35).
const laterMeetup = { ...meetup, id: 8, starts_at: hoursFromNow(24), ends_at: hoursFromNow(26) }

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  localStorage.clear()
})

async function render(user: User | null, onLoginNeeded = () => {}) {
  const container = document.createElement('div')
  document.body.append(container)
  await act(async () =>
    createRoot(container).render(
      <PlaceMeetups placeId={3} user={user} onLoginNeeded={onLoginNeeded} onChanged={() => {}} />,
    ),
  )
  return container
}

const button = (container: HTMLElement, text: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

describe('PlaceMeetups', () => {
  it('lists the active Meetups with Host and people', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([meetup])))

    const text = (await render(null)).textContent

    expect(text).toContain('LIVE')
    expect(text).toContain('Paula')
    expect(text).toContain('3 Personen')
  })

  it('shows "Jetzt beenden" only to the Host', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([meetup])))
    expect(button(await render(paula), 'Jetzt beenden')).toBeDefined()

    document.body.innerHTML = ''
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([meetup])))
    const other = { ...paula, id: 2, nickname: 'Karl' }
    expect(button(await render(other), 'Jetzt beenden')).toBeUndefined()
  })

  it('asks a guest to log in before "Ich bin jetzt hier"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([])))
    const onLoginNeeded = vi.fn()
    const container = await render(null, onLoginNeeded)

    act(() => button(container, 'Ich bin jetzt hier')!.click())

    expect(onLoginNeeded).toHaveBeenCalledOnce()
  })

  it('offers 1 to 4 hours, 2 chosen, and a Party size from 1 to 10', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([])))
    const container = await render(paula)

    act(() => button(container, 'Ich bin jetzt hier')!.click())

    const hours = [...container.querySelectorAll('.segments button')]
    expect(hours.map((b) => b.textContent)).toEqual(['1 h', '2 h', '3 h', '4 h'])
    expect(hours.find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent).toBe('2 h')
    expect(button(container, '−')!.disabled).toBe(true)
    for (let i = 0; i < 12; i++) act(() => button(container, '+')!.click())
    expect(container.querySelector('output')!.textContent).toBe('10')
    expect(button(container, '+')!.disabled).toBe(true)
  })

  it('shows a later Meetup with its date and time, not as LIVE', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([laterMeetup])))

    const text = (await render(null)).textContent

    expect(text).not.toContain('LIVE')
    expect(text).toMatch(/\d\d\.\d\d\., \d\d:\d\d–\d\d:\d\d Uhr/)
  })

  it('offers the Host "Zeit ändern" for a later Meetup, not "Jetzt beenden"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([laterMeetup])))
    const container = await render(paula)

    expect(button(container, 'Zeit ändern')).toBeDefined()
    expect(button(container, 'Jetzt beenden')).toBeUndefined()
  })

  it('plans a later Meetup with the chosen start time', async () => {
    localStorage.setItem('squadmeet.token', 'tok')
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'POST' ? Response.json(laterMeetup, { status: 201 }) : Response.json([]),
    )
    vi.stubGlobal('fetch', fetchMock)
    const container = await render(paula)

    act(() => button(container, 'Später treffen')!.click())
    const field = container.querySelector<HTMLInputElement>('input[type="datetime-local"]')!
    expect(field.value).not.toBe('')
    await act(async () => button(container, 'Treffen planen')!.click())

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    const body = JSON.parse(post[1]!.body as string)
    expect(new Date(body.starts_at).getTime()).toBe(new Date(field.value).getTime())
    expect(body).toMatchObject({ place_id: 3, hours: 2, party_size: 1 })
  })

  it('lets the Host move the start of a later Meetup', async () => {
    localStorage.setItem('squadmeet.token', 'tok')
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'PATCH' ? Response.json(laterMeetup) : Response.json([laterMeetup]),
    )
    vi.stubGlobal('fetch', fetchMock)
    const container = await render(paula)

    act(() => button(container, 'Zeit ändern')!.click())
    await act(async () => button(container, 'Speichern')!.click())

    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')!
    expect(patch[0]).toBe('/api/meetups/8')
    expect(new Date(JSON.parse(patch[1]!.body as string).starts_at).getTime()).toBe(
      new Date(laterMeetup.starts_at).setSeconds(0, 0),
    )
  })
})
