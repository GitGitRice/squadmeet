import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPlace, fetchPlaces, type MapArea, type Place } from './places'

const place: Place = {
  id: 1,
  name: 'Tischtennisplatte',
  activity_type: 'table_tennis',
  lat: 51.33,
  lon: 12.36,
}

const leipzig: MapArea = { west: 12.3, south: 51.3, east: 12.4, north: 51.35 }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchPlaces', () => {
  it('asks for the Places inside the map area', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([place]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchPlaces(leipzig)).resolves.toEqual([place])
    expect(fetchMock).toHaveBeenCalledWith('/api/places?bbox=12.30000,51.30000,12.40000,51.35000')
  })

  it('throws when the API answers with an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))

    await expect(fetchPlaces(leipzig)).rejects.toThrow('500')
  })
})

describe('fetchPlace', () => {
  it('asks for one Place by id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(place))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchPlace(1)).resolves.toEqual(place)
    expect(fetchMock).toHaveBeenCalledWith('/api/places/1')
  })

  it('says in German when the Place does not exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })))

    await expect(fetchPlace(9)).rejects.toThrow('Diesen Platz gibt es nicht')
  })
})
