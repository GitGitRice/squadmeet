import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveToken, type User } from '../api/auth'
import type { RatingSummary } from '../api/ratings'
import PlaceRatings from './PlaceRatings'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const paula: User = { id: 1, nickname: 'Paula', avatar: 'fox', mfa_enabled: false, is_admin: false }

const empty: RatingSummary = {
  count: 0,
  average_stars: null,
  top_reasons: [],
  condition: { state: 'unknown', issues: [] },
}

const rated: RatingSummary = {
  count: 2,
  average_stars: 3.5,
  top_reasons: [{ key: 'table_good', label: 'Platte in gutem Zustand', positive: true, count: 2 }],
  condition: {
    state: 'issues',
    issues: [{ key: 'net_missing', label: 'Netz fehlt oder ist kaputt', positive: false, count: 1 }],
  },
}

const reasons = [
  { key: 'table_good', label: 'Platte in gutem Zustand', positive: true },
  { key: 'net_missing', label: 'Netz fehlt oder ist kaputt', positive: false },
]

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  localStorage.clear()
})

// Answers by URL, like the API: summary, Reasons, own Rating, save.
function api(summary: RatingSummary, mine: unknown = null) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/reasons')) return Response.json(reasons)
    if (url.endsWith('/ratings/mine') && init?.method === 'PUT') {
      return Response.json({ place_id: 3, ...JSON.parse(String(init.body)), updated_at: 'now' })
    }
    if (url.endsWith('/ratings/mine')) return Response.json(mine)
    return Response.json(summary)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function render(user: User | null, onLoginNeeded = () => {}) {
  const container = document.createElement('div')
  document.body.append(container)
  await act(async () =>
    createRoot(container).render(<PlaceRatings placeId={3} user={user} onLoginNeeded={onLoginNeeded} />),
  )
  return container
}

const button = (container: HTMLElement, text: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

async function click(element: HTMLElement | undefined) {
  await act(async () => element!.click())
}

describe('PlaceRatings', () => {
  it('shows average stars, top Reasons and the Condition', async () => {
    api(rated)

    const text = (await render(null)).textContent

    expect(text).toContain('3,5')
    expect(text).toContain('2 Bewertungen')
    expect(text).toContain('Platte in gutem Zustand')
    expect(text).toContain('Mängel gemeldet')
    expect(text).toContain('Netz fehlt oder ist kaputt (1×)')
  })

  it('says when there are no Ratings yet', async () => {
    api(empty)

    const text = (await render(null)).textContent

    expect(text).toContain('Noch keine Bewertungen')
    expect(text).toContain('keine aktuellen Bewertungen')
  })

  it('asks a guest to log in before rating', async () => {
    api(empty)
    const onLoginNeeded = vi.fn()
    const container = await render(null, onLoginNeeded)

    await click(button(container, 'Platz bewerten'))

    expect(onLoginNeeded).toHaveBeenCalledOnce()
  })

  it('saves only with stars and at least one Reason', async () => {
    saveToken('tok')
    const fetchMock = api(empty)
    const container = await render(paula)
    await click(button(container, 'Platz bewerten'))
    const save = () => button(container, 'Bewertung speichern')!

    expect(save().disabled).toBe(true)
    await click(container.querySelector<HTMLButtonElement>('[aria-label="4 Sterne"]')!)
    expect(save().disabled).toBe(true)
    expect(container.textContent).toContain('mindestens eine Begründung')
    await click(button(container, 'Netz fehlt'))
    expect(save().disabled).toBe(false)

    await click(save())

    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!
    expect(JSON.parse(String(put[1]!.body))).toEqual({ stars: 4, reasons: ['net_missing'] })
    expect(button(container, 'Deine Bewertung ändern')).toBeDefined()
  })

  it('starts the form with the own Rating, to change it', async () => {
    saveToken('tok')
    api(rated, { place_id: 3, stars: 2, reasons: ['net_missing'], updated_at: 'x' })
    const container = await render(paula)

    await click(button(container, 'Deine Bewertung ändern'))

    expect(container.querySelector('[aria-label="2 Sterne"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(button(container, 'Netz fehlt')!.getAttribute('aria-pressed')).toBe('true')
    expect(button(container, 'Platte in gutem')!.getAttribute('aria-pressed')).toBe('false')
  })
})
