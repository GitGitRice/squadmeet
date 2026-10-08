import type { Place } from '../api/places'
import type { ActivityType } from './activities'

// The map shows only the Places of the chosen Activity types; nothing chosen = nothing shown.
export function filterPlaces(places: Place[], chosen: ReadonlySet<ActivityType>): Place[] {
  return places.filter((place) => chosen.has(place.activity_type as ActivityType))
}
