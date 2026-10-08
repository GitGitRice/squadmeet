import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ActivityFilter from './ActivityFilter'
import { ACTIVITY_TYPES, type ActivityType } from './activities'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  document.body.innerHTML = ''
})

function render(chosen: Set<ActivityType>, onChange: (next: Set<ActivityType>) => void) {
  const container = document.createElement('div')
  document.body.append(container)
  act(() => createRoot(container).render(<ActivityFilter chosen={chosen} onChange={onChange} />))
  return container
}

describe('ActivityFilter', () => {
  it('has one button per Activity type, pressed when chosen', () => {
    const container = render(new Set(['basketball']), () => {})
    const buttons = container.querySelectorAll('button')

    expect(buttons).toHaveLength(ACTIVITY_TYPES.length)
    const pressed = [...buttons].filter((b) => b.getAttribute('aria-pressed') === 'true')
    expect(pressed.map((b) => b.textContent)).toEqual(['🏀 Basketball'])
  })

  it('switches a type off and on', () => {
    const onChange = vi.fn()
    const container = render(new Set(ACTIVITY_TYPES), onChange)
    const basketball = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Basketball'))!

    act(() => basketball.click())

    const next: Set<ActivityType> = onChange.mock.calls[0][0]
    expect(next.has('basketball')).toBe(false)
    expect(next.size).toBe(ACTIVITY_TYPES.length - 1)
  })
})
