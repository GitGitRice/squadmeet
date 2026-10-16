import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PhotoApprovalDialog from './PhotoApprovalDialog'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const pending = {
  id: 4,
  url: 'https://photos.example/places/7/a.jpg?signed',
  width: 800,
  height: 600,
  created_at: '2026-10-16T08:00:00Z',
  place_id: 7,
  place_name: 'Korbanlage',
  activity_type: 'basketball',
  nickname: 'Pingpong_Paula',
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 })
}

async function render(props: Partial<Parameters<typeof PhotoApprovalDialog>[0]> = {}) {
  const container = document.createElement('div')
  document.body.append(container)
  await act(async () =>
    createRoot(container).render(
      <PhotoApprovalDialog token="t" onChanged={() => {}} onOpenPlace={() => {}} onClose={() => {}} {...props} />,
    ),
  )
  return container
}

function button(container: HTMLElement, text: string) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent === text)
}

describe('PhotoApprovalDialog', () => {
  it('lists the pending photos with Place and uploader', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([pending])))

    const container = await render()

    expect(container.querySelector('img')?.getAttribute('src')).toBe(pending.url)
    expect(container.textContent).toContain('Korbanlage')
    expect(container.textContent).toContain('Pingpong_Paula')
  })

  it('names a deleted account', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([{ ...pending, nickname: null }])))

    expect((await render()).textContent).toContain('gelöschtes Konto')
  })

  it('approves a photo and takes it off the list', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json([pending]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const onChanged = vi.fn()
    const container = await render({ onChanged })

    await act(async () => button(container, 'Freigeben')?.click())

    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/photos/4/approve')
    expect(onChanged).toHaveBeenCalled()
    expect(container.textContent).toContain('Kein Foto wartet auf die Freigabe.')
  })

  it('rejects only after the second step', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json([pending]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const container = await render()

    act(() => button(container, 'Ablehnen')?.click())
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => button(container, 'Ja, ablehnen')?.click())

    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/photos/4/reject')
    expect(container.querySelector('img')).toBeNull()
  })
})
