import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPlaces, type Place } from './places'

const place: Place = {
  id: 1,
  name: 'Tischtennisplatte',
  activity_type: 'table_tennis',
  lat: 51.33,
  lon: 12.36,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchPlaces', () => {
  it('returns the Places from the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([place]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchPlaces()).resolves.toEqual([place])
    expect(fetchMock).toHaveBeenCalledWith('/api/places')
  })

  it('throws when the API answers with an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))

    await expect(fetchPlaces()).rejects.toThrow('500')
  })
})
