// Place suggestions (SCRUM-30): the API of backend/app/suggestions.py.
import { answer } from './meetups'
import type { Place } from './places'
import type { ActivityType } from '../places/activities'

// The duplicate warning shows Places of the same Activity type within this distance.
export const DUPLICATE_RADIUS_M = 50
export const CONFIRMATIONS_NEEDED = 3

export type NearbyPlace = Place & { distance_m: number }

export type SuggestionInput = { activity_type: ActivityType; lat: number; lon: number; name: string }

export async function fetchNearby(input: Omit<SuggestionInput, 'name'>): Promise<NearbyPlace[]> {
  const query = new URLSearchParams({
    lat: String(input.lat),
    lon: String(input.lon),
    activity_type: input.activity_type,
  })
  return answer(await fetch(`/api/place-suggestions/nearby?${query}`), 'GET nearby places')
}

export async function suggestPlace(token: string, input: SuggestionInput): Promise<Place> {
  const response = await fetch('/api/place-suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
  return answer(response, 'POST place suggestion')
}
