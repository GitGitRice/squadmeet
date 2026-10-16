import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FavoriteButton from './FavoriteButton'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

async function render(token: string | null, fetchMock = vi.fn()) {
  vi.stubGlobal('fetch', fetchMock)
  const container = document.createElement('div')
  document.body.append(container)
  const login = vi.fn()
  await act(async () => createRoot(container).render(
    <FavoriteButton placeId={7} token={token} onLoginNeeded={login} />,
  ))
  return { container, login }
}

describe('FavoriteButton (SCRUM-41)', () => {
  it('asks a guest to log in', async () => {
    const { container, login } = await render(null)
    await act(async () => container.querySelector('button')!.click())
    expect(login).toHaveBeenCalledOnce()
  })

  it('loads and adds a Favorite', async () => {
    const favorite = { id: 2, place: { id: 7, name: 'Korbanlage', address: null }, rules: [] }
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(null)).mockResolvedValueOnce(Response.json(favorite))
    const { container } = await render('tok', fetchMock)

    expect(container.textContent).toContain('Als Favorit merken')
    await act(async () => container.querySelector('button')!.click())

    expect(fetchMock.mock.calls[1][0]).toBe('/api/places/7/favorite')
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT')
    expect(container.textContent).toContain('Favorit entfernen')
    expect(container.textContent).toContain('Konto → Favoriten')
  })

  it('removes an existing Favorite', async () => {
    const favorite = { id: 2, place: { id: 7, name: 'Korbanlage', address: null }, rules: [] }
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(favorite)).mockResolvedValueOnce(new Response(null, { status: 204 }))
    const { container } = await render('tok', fetchMock)

    await act(async () => container.querySelector('button')!.click())

    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE')
    expect(container.textContent).toContain('Als Favorit merken')
  })
})
