// Place suggestions (SCRUM-30, SCRUM-36): the API of backend/app/suggestions.py.
import { answer } from './http'
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

export type Position = { lat: number; lon: number; accuracy: number }

export function locate(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Dein Browser kann den Standort nicht bestimmen.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude, accuracy: coords.accuracy }),
      () => reject(new Error('Kein Standort. Erlaube den Standort für diese Seite und versuche es noch einmal.')),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    )
  })
}

export async function confirmPlace(
  token: string,
  placeId: number,
  input: { lat: number; lon: number },
): Promise<Place> {
  const response = await fetch(`/api/place-suggestions/${placeId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
  return answer(response, 'POST place confirmation')
}

