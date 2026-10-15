import { describe, expect, it } from 'vitest'
import { countFor } from './requestCount'

describe('Contact request count on the "Konto" button (SCRUM-32)', () => {
  it('shows the count of the logged-in user', () => {
    expect(countFor({ userId: 1, count: 3 }, 1)).toBe(3)
  })

  it('shows nothing after a logout, or to the next user before their own count has loaded', () => {
    expect(countFor({ userId: 1, count: 3 }, undefined)).toBe(0)
    expect(countFor({ userId: 1, count: 3 }, 2)).toBe(0)
    expect(countFor(null, 2)).toBe(0)
  })
})
