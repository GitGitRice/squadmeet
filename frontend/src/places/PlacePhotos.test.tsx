import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveToken } from '../api/auth'
import PlacePhotos from './PlacePhotos'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const user = { id: 1, nickname: 'Stefan', avatar: 'fox', is_admin: false, mfa_enabled: false }

const photo = {
  id: 3,
  url: 'https://photos.example/places/7/a.jpg?signed',
  width: 1600,
  height: 1200,
  created_at: '2026-10-16T08:00:00Z',
}

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  vi.unstubAllGlobals()
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

async function render(props: Partial<Parameters<typeof PlacePhotos>[0]> = {}) {
  const container = document.createElement('div')
  document.body.append(container)
  await act(async () =>
    createRoot(container).render(<PlacePhotos placeId={7} user={null} onLoginNeeded={() => {}} {...props} />),
  )
  return container
}

function button(container: HTMLElement, text: string) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent === text)
}

async function choose(container: HTMLElement, file: File) {
  const input = container.querySelector<HTMLInputElement>('input[type=file]')!
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
}

describe('PlacePhotos', () => {
  it('shows the approved photos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([photo])))

    const container = await render()

    const img = container.querySelector('img')!
    expect(img.getAttribute('src')).toBe(photo.url)
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  it('says when there are none, with the notice about people', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([])))

    const text = (await render()).textContent

    expect(text).toContain('Noch keine Fotos.')
    expect(text).toContain('Bitte keine Personen auf den Fotos.')
  })

  it('asks a guest to log in', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([])))
    const onLoginNeeded = vi.fn()
    const container = await render({ onLoginNeeded })

    act(() => button(container, 'Foto hinzufügen')?.click())

    expect(onLoginNeeded).toHaveBeenCalled()
  })

  it('uploads the chosen file and says it waits for an Admin', async () => {
    saveToken('t')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json([]))
      .mockResolvedValueOnce(json({ id: 9, pending: true }, 201))
    vi.stubGlobal('fetch', fetchMock)
    const container = await render({ user })

    await choose(container, new File(['x'], 'platz.jpg', { type: 'image/jpeg' }))

    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('/api/places/7/photos')
    expect(init.method).toBe('POST')
    expect((init.body as FormData).get('file')).toBeInstanceOf(File)
    expect(container.textContent).toContain('sobald ein Admin es freigegeben hat')
    // The pending Photo is not shown.
    expect(container.querySelector('img')).toBeNull()
  })

  it('does not send a file that is too big or of the wrong type', async () => {
    saveToken('t')
    const fetchMock = vi.fn().mockResolvedValue(json([]))
    vi.stubGlobal('fetch', fetchMock)
    const container = await render({ user })

    await choose(container, new File(['x'], 'a.gif', { type: 'image/gif' }))
    expect(container.textContent).toContain('Nur JPEG, PNG oder WebP')

    const big = new File(['x'], 'b.jpg', { type: 'image/jpeg' })
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 })
    await choose(container, big)
    expect(container.textContent).toContain('größer als 10 MB')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shows the server answer when the limit is reached', async () => {
    saveToken('t')
    const conflict = json({ detail: 'Du hast hier schon 3 Fotos, die auf die Freigabe warten' }, 409)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json([])).mockResolvedValueOnce(conflict))
    const container = await render({ user })

    await choose(container, new File(['x'], 'c.png', { type: 'image/png' }))

    expect(container.textContent).toContain('schon 3 Fotos')
    expect(container.textContent).not.toContain('Danke!')
  })
})
