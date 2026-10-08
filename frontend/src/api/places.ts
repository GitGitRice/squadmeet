export type Place = {
  id: number
  name: string
  activity_type: string
  lat: number
  lon: number
}

// The visible map area in degrees, in the order the API expects.
export type MapArea = { west: number; south: number; east: number; north: number }

export async function fetchPlaces(area: MapArea): Promise<Place[]> {
  const bbox = [area.west, area.south, area.east, area.north].map((v) => v.toFixed(5)).join(',')
  const response = await fetch(`/api/places?bbox=${bbox}`)
  if (!response.ok) {
    throw new Error(`GET /api/places failed: ${response.status}`)
  }
  return response.json()
}
