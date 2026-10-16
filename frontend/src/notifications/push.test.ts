import { describe, expect, it } from 'vitest'
import { applicationServerKey, needsIosHomeScreen } from './push'

describe('Web Push browser helpers (SCRUM-44)', () => {
  it('decodes a URL-safe VAPID public key', () => {
    expect([...applicationServerKey('AQID-_8')]).toEqual([1, 2, 3, 251, 255])
  })

  it('shows the home-screen hint only for iOS outside standalone mode', () => {
    expect(needsIosHomeScreen('Mozilla/5.0 (iPhone)', false)).toBe(true)
    expect(needsIosHomeScreen('Mozilla/5.0 (iPhone)', true)).toBe(false)
    expect(needsIosHomeScreen('Mozilla/5.0 (Linux; Android 15)', false)).toBe(false)
  })
})
