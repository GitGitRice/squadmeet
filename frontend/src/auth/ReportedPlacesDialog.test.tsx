import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReportedPlace } from '../api/admin'
import ReportedPlacesDialog from './ReportedPlacesDialog'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

function reported(changes: Partial<ReportedPlace> = {}): ReportedPlace {
  return {
    id: 7,
    name: 'Platte im Hof',
    activity_type: 'table_tennis',
    lat: 51.34,
    lon: 12.37,
    address: null,
    reasons: { dangerous: 2, not_public: 1 },
    first_reported_at: '2026-10-14T10:00:00Z',
    hidden: true,
    ...changes,
  }
}

async function render(list: ReportedPlace[], ...more: Response[]) {
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(list)))
  for (const response of more) fetchMock.mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', fetchMock)
  const onChanged = vi.fn()
  const onOpenPlace = vi.fn()
  const container = document.createElement('div')
  document.body.append(container)
  await act(async () =>
    createRoot(container).render(
      <ReportedPlacesDialog token="t" onChanged={onChanged} onOpenPlace={onOpenPlace} onClose={() => {}} />,
    ),
  )
  return { container, fetchMock, onChanged, onOpenPlace }
}

function button(container: HTMLElement, text: string) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent === text)
}

describe('ReportedPlacesDialog', () => {
  it('lists the reasons and whether the Place is off the map', async () => {
    const { container, fetchMock } = await render([reported()])

    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/place-reports')
    expect(container.textContent).toContain('Platte im Hof')
    expect(container.textContent).toContain('Gefährlich 2×, Nicht öffentlich 1×')
    expect(container.textContent).toContain('nicht auf der Karte')
  })

  it('says when no Place is reported', async () => {
    const { container } = await render([])

    expect(container.textContent).toContain('Kein Platz ist gemeldet.')
  })

  it('dismisses the reports and takes the Place off the list', async () => {
    const { container, fetchMock, onChanged } = await render([reported()], new Response(null, { status: 204 }))

    await act(async () => button(container, 'Verwerfen')?.click())

    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/place-reports/7/dismiss')
    expect(fetchMock.mock.calls[1][1].method).toBe('POST')
    expect(onChanged).toHaveBeenCalled()
    expect(container.textContent).toContain('Kein Platz ist gemeldet.')
  })

  it('locks only after the second step', async () => {
    const { container, fetchMock } = await render(
      [reported()],
      new Response(JSON.stringify({ id: 7 }), { status: 200 }),
    )

    act(() => button(container, 'Sperren')?.click())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => button(container, 'Ja, sperren')?.click())

    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/places/7/lock')
    expect(container.textContent).toContain('Kein Platz ist gemeldet.')
  })

  it('opens the Place detail', async () => {
    const { container, onOpenPlace } = await render([reported()])

    act(() => button(container, 'Platz ansehen')?.click())

    expect(onOpenPlace).toHaveBeenCalledWith(7)
  })
})
