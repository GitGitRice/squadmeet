export type Place = {
  id: number
  name: string
  activity_type: string
  lat: number
  lon: number
  // Party sizes of the Meetups at the Place right now; 0 = nobody is there (SCRUM-29).
  people_now: number
}

// The visible map area in degrees, in the order the API expects.
export type MapArea = { west: number; south: number; east: number; north: number }

// `truncated`: the area has more Places than the API sends; the map asks the user to zoom in.
export type PlacesAnswer = { places: Place[]; truncated: boolean }

// Leaflet reports longitudes beyond ±180 when the map shows the world more than once; the API
// accepts only real coordinates.
export function clampArea(area: MapArea): MapArea {
  return {
    west: Math.max(-180, area.west),
    south: Math.max(-90, area.south),
    east: Math.min(180, area.east),
    north: Math.min(90, area.north),
  }
}

export async function fetchPlaces(area: MapArea, signal?: AbortSignal): Promise<PlacesAnswer> {
  const { west, south, east, north } = clampArea(area)
  const bbox = [west, south, east, north].map((v) => v.toFixed(5)).join(',')
  const response = await fetch(`/api/places?bbox=${bbox}`, { signal })
  if (!response.ok) {
    throw new Error(`GET /api/places failed: ${response.status}`)
  }
  return { places: await response.json(), truncated: response.headers.get('X-Places-Truncated') === 'true' }
}

export async function fetchPlace(id: number): Promise<Place> {
  const response = await fetch(`/api/places/${id}`)
  if (response.status === 404) {
    throw new Error('Diesen Platz gibt es nicht (mehr).')
  }
  if (!response.ok) {
    throw new Error(`GET /api/places/${id} failed: ${response.status}`)
  }
  return response.json()
}
