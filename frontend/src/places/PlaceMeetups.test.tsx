import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { User } from '../api/auth'
import PlaceMeetups from './PlaceMeetups'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const paula: User = { id: 1, nickname: 'Paula', avatar: 'fox', mfa_enabled: false, is_admin: false }
const meetup = {
  id: 7,
  place_id: 3,
  host: { id: 1, nickname: 'Paula', avatar: 'fox' },
  party_size: 3,
  starts_at: '2026-10-12T09:00:00Z',
  ends_at: '2026-10-12T11:00:00Z',
}

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
})
