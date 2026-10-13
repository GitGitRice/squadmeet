import { describe, expect, it } from 'vitest'
import { routeUrl } from './routeLink'

describe('routeUrl', () => {
  it('uses Apple Maps on iOS', () => {
    const navigator = { userAgent: 'Mozilla/5.0 (iPhone)', platform: 'iPhone', maxTouchPoints: 5 }

    expect(routeUrl(51.3, 12.3, navigator)).toBe(
      'https://maps.apple.com/?daddr=51.3,12.3&dirflg=d',
    )
  })

  it('recognizes an iPad that requests the desktop website', () => {
    const navigator = { userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 5 }

    expect(routeUrl(51.3, 12.3, navigator)).toContain('maps.apple.com')
  })

  it('uses Google Maps on other devices', () => {
    const navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 16)', platform: 'Linux', maxTouchPoints: 5 }

    expect(routeUrl(51.3, 12.3, navigator)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=51.3,12.3',
    )
  })
})
