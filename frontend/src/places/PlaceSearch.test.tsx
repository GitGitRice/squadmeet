import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as placesApi from '../api/places'
import PlaceSearch from './PlaceSearch'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

function render(onPick = vi.fn()) {
  const container = document.createElement('div')
  document.body.append(container)
  act(() => createRoot(container).render(<PlaceSearch onPick={onPick} />))
  return { container, onPick }
}

async function search(container: HTMLElement, query: string) {
  const input = container.querySelector('input')!
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, query)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

describe('PlaceSearch', () => {
  it('searches only when the form is submitted and reports no hit', async () => {
    const request = vi.spyOn(placesApi, 'searchPlaces').mockResolvedValue([])
    const { container } = render()

    expect(request).not.toHaveBeenCalled()
    await search(container, 'Unbekannt')

    expect(request).toHaveBeenCalledWith('Unbekannt')
    expect(container.textContent).toContain('Keine Treffer')
  })

  it('passes a picked Place hit to the map', async () => {
    const hit = { kind: 'place' as const, label: 'Clara-Zetkin-Park', lat: 51.34, lon: 12.35, place_id: 7 }
    vi.spyOn(placesApi, 'searchPlaces').mockResolvedValue([hit])
    const { container, onPick } = render()
    await search(container, 'Zetkin')

    const hitButton = [...container.querySelectorAll('.search-results button')][0] as HTMLButtonElement
    act(() => hitButton.click())

    expect(onPick).toHaveBeenCalledWith(hit)
  })
})
