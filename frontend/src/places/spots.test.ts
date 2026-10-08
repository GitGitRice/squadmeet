import { describe, expect, it } from 'vitest'
import type { Place } from '../api/places'
import { groupBySpot, typeCount } from './spots'

const place = (id: number, activity_type: string, lat = 51.3, lon = 12.3): Place => ({
  id,
  name: '',
  activity_type,
  lat,
  lon,
})

describe('groupBySpot', () => {
  it('puts Places on the same spot into one group', () => {
    const spots = groupBySpot([place(1, 'football'), place(2, 'basketball'), place(3, 'football', 51.4)])

    expect(spots.map((spot) => spot.places.map((p) => p.id))).toEqual([[1, 2], [3]])
  })

  it('counts the different Activity types of a spot', () => {
    const [spot] = groupBySpot([place(1, 'football'), place(2, 'basketball'), place(3, 'football')])

    expect(typeCount(spot)).toBe(2)
  })
})
