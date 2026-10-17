import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomeAreaDialog from './HomeAreaDialog'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Leaflet needs a real browser; the test map is one button that "taps" a point.
vi.mock('./HomeAreaMap', () => ({
  default: ({ point, onPick }: { point: { lat: number } | null; onPick: (p: object) => void }) => (
    <button type="button" onClick={() => onPick({ lat: 51.3, lon: 12.4 })}>
      Karte {point ? `Punkt ${point.lat}` : 'ohne Punkt'}
    </button>
  ),
}))

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

const saved = {
  lat: 51.34,
  lon: 12.37,
  radius_km: 5,
  activity_types: ['basketball'],
}

async function renderDialog(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock)
  const container = document.createElement('div')
  document.body.append(container)
  await act(async () =>
    createRoot(container).render(
      <HomeAreaDialog token="tok" fallbackCenter={[51.3, 12.4]} onClose={() => {}} />,
    ),
  )
  return container
}

function button(container: HTMLElement, text: string) {
  const found = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
  if (!found) throw new Error(`no button "${text}"`)
  return found
}

function checkbox(container: HTMLElement, label: string) {
  const found = [...container.querySelectorAll('label')].find((l) => l.textContent?.includes(label))
  return found!.querySelector('input')!
}

describe('HomeAreaDialog (SCRUM-45)', () => {
  it('needs a point before it can be turned on; all Activity types are chosen at first', async () => {
    const container = await renderDialog(vi.fn(async () => Response.json(null)))

    expect(button(container, 'Heimatbereich einschalten').disabled).toBe(true)
    expect(container.textContent).toContain('Radius: 3 km')
    expect(container.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(5)
    expect(container.textContent).not.toContain('ausschalten')
  })

  it('saves the tapped point, the radius and the chosen Activity types', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'PUT' ? Response.json(JSON.parse(String(init.body))) : Response.json(null),
    )
    const container = await renderDialog(fetchMock)

    await act(async () => button(container, 'Karte').click())
    const range = container.querySelector<HTMLInputElement>('input[type="range"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(range, '12')
      range.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => checkbox(container, 'Fußball').click())
    await act(async () => button(container, 'Heimatbereich einschalten').click())

    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('/api/home-area')
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(String(init?.body))).toEqual({
      lat: 51.3,
      lon: 12.4,
      radius_km: 12,
      activity_types: ['table_tennis', 'basketball', 'beach_volleyball', 'outdoor_fitness'],
    })
    expect(container.textContent).toContain('Gespeichert')
    expect(button(container, 'Heimatbereich ausschalten')).toBeTruthy()
  })

  it('shows the saved Home area and turns it off', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json(saved),
    )
    const container = await renderDialog(fetchMock)

    expect(container.textContent).toContain('Punkt 51.34')
    expect(container.textContent).toContain('Radius: 5 km')
    expect(checkbox(container, 'Basketball').checked).toBe(true)
    expect(checkbox(container, 'Tischtennis').checked).toBe(false)

    await act(async () => button(container, 'Heimatbereich ausschalten').click())

    expect(fetchMock.mock.calls[1][1]?.method).toBe('DELETE')
    expect(container.textContent).toContain('Der Punkt ist gelöscht')
    expect(container.textContent).toContain('Karte ohne Punkt')
  })

  it('cannot save without an Activity type', async () => {
    const container = await renderDialog(vi.fn(async () => Response.json(saved)))

    await act(async () => checkbox(container, 'Basketball').click())

    expect(container.textContent).toContain('Wähle mindestens eine Sportart')
    expect(button(container, 'Änderungen speichern').disabled).toBe(true)
  })
})
