import type { Place } from '../api/places'

// A pitch for two sports is two Places on the same spot (one per Activity type). The map shows
// one marker per spot, so no marker hides another one (Steven's review of SCRUM-21, point 3).
export type Spot = { lat: number; lon: number; places: Place[] }

export function groupBySpot(places: Place[]): Spot[] {
  const spots = new Map<string, Spot>()
  for (const place of places) {
    const key = `${place.lat},${place.lon}`
    const spot = spots.get(key)
    if (spot) spot.places.push(place)
    else spots.set(key, { lat: place.lat, lon: place.lon, places: [place] })
  }
  return [...spots.values()]
}

// How many different Activity types a spot has; the marker shows this number.
export function typeCount(spot: Spot): number {
  return new Set(spot.places.map((place) => place.activity_type)).size
}
