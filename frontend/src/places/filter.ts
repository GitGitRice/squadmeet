import type { Place } from '../api/places'
import { ACTIVITIES, type ActivityType } from './activities'

// The map shows only the Places of the chosen Activity types, with two exceptions:
// - the open Place (keepId) stays, so its marker does not vanish under the open detail panel;
// - a type the frontend does not know yet (newer backend) is never hidden; it shows with 📍.
export function filterPlaces(
  places: Place[],
  chosen: ReadonlySet<ActivityType>,
  keepId: number | null = null,
): Place[] {
  return places.filter(
    (place) =>
      place.id === keepId ||
      !(place.activity_type in ACTIVITIES) ||
      chosen.has(place.activity_type as ActivityType),
  )
}
