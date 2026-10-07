export type Place = {
  id: number
  name: string
  activity_type: string
  lat: number
  lon: number
}

export async function fetchPlaces(): Promise<Place[]> {
  const response = await fetch('/api/places')
  if (!response.ok) {
    throw new Error(`GET /api/places failed: ${response.status}`)
  }
  return response.json()
}
