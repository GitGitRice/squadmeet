import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PlaceDetail from './PlaceDetail'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  document.body.innerHTML = ''
})

function render(props: Parameters<typeof PlaceDetail>[0]) {
  const container = document.createElement('div')
  document.body.append(container)
  act(() => createRoot(container).render(<PlaceDetail {...props} />))
  return container
}

const place = { id: 7, name: 'Korbanlage', activity_type: 'basketball', lat: 51.3, lon: 12.3, people_now: 0, is_suggestion: false, confirmations: 0 }

describe('PlaceDetail', () => {
  it('shows name, Activity type and location', () => {
    const text = render({ place, error: null, onRetry: () => {}, onClose: () => {} }).textContent

    expect(text).toContain('Korbanlage')
    expect(text).toContain('Basketball')
    expect(text).toContain('51.30000, 12.30000')
  })

  it('marks a Place suggestion and hides the Meetups', () => {
    const suggestion = { ...place, is_suggestion: true, confirmations: 1 }
    const container = render({ place: suggestion, error: null, onRetry: () => {}, onClose: () => {}, children: <p>Treffen hier</p> })

    expect(container.textContent).toContain('1 von 3 Bestätigungen')
    expect(container.textContent).not.toContain('Treffen hier')
  })

  it('offers to try again after an error', () => {
    const onRetry = vi.fn()
    const container = render({ place: null, error: 'GET failed: 500', onRetry, onClose: () => {} })
    const retry = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Nochmal versuchen')!

    act(() => retry.click())

    expect(onRetry).toHaveBeenCalledOnce()
  })
})
