import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveToken } from '../api/auth'
import PlaceDetail from './PlaceDetail'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const place = {
  id: 7,
  name: 'Korbanlage',
  activity_type: 'basketball',
  lat: 51.3,
  lon: 12.3,
  people_now: 0,
  is_suggestion: false,
  confirmations: 0,
}
const admin = { id: 1, nickname: 'Steven', avatar: 'fox', is_admin: true, mfa_enabled: true }

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  vi.unstubAllGlobals()
})

function render(props: Partial<Parameters<typeof PlaceDetail>[0]>) {
  const container = document.createElement('div')
  document.body.append(container)
  act(() =>
    createRoot(container).render(
      <PlaceDetail place={place} error={null} onRetry={() => {}} onClose={() => {}} {...props} />,
    ),
  )
  return container
}

function button(container: HTMLElement, text: string) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent === text)
}

describe('Admin actions in the Place detail (SCRUM-39)', () => {
  it('are hidden for a normal user and for an Admin without MFA', () => {
    expect(render({ user: { ...admin, is_admin: false } }).textContent).not.toContain('Platz sperren')
    expect(render({ user: { ...admin, mfa_enabled: false } }).textContent).not.toContain('Platz sperren')
  })

  it('are shown for a Place suggestion too', () => {
    const text = render({ user: admin, place: { ...place, is_suggestion: true } }).textContent
    expect(text).toContain('Platz sperren')
  })

  it('lock asks first, then calls the API and reports the removal', async () => {
    saveToken('t')
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const onRemoved = vi.fn()
    const container = render({ user: admin, onRemoved })

    act(() => button(container, 'Platz sperren')!.click())
    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => button(container, 'Ja, sperren')!.click())

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/places/7/lock', {
      method: 'POST',
      headers: { Authorization: 'Bearer t' },
    })
    expect(onRemoved).toHaveBeenCalled()
  })

  it('delete shows the server error and keeps the Place open', async () => {
    saveToken('t')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Nur für Admins' }), { status: 403 })),
    )
    const onRemoved = vi.fn()
    const container = render({ user: admin, onRemoved })

    act(() => button(container, 'Platz löschen')!.click())
    await act(async () => button(container, 'Ja, löschen')!.click())

    expect(container.textContent).toContain('Nur für Admins')
    expect(onRemoved).not.toHaveBeenCalled()
  })
})
