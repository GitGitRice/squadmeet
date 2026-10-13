// Admin: lock, unlock and delete a Place (SCRUM-39): the API of backend/app/admin_places.py.
// The server allows it only for an Admin with MFA on.
import type { User } from './auth'
import { answer } from './http'

export type LockedPlace = {
  id: number
  name: string
  activity_type: string
  address: string | null
  locked_at: string
}

/** The server checks the same: an Admin without MFA gets 403. */
export function canModerate(user: User | null | undefined): boolean {
  return !!user && user.is_admin && user.mfa_enabled
}

function call(token: string, method: string, path: string) {
  return fetch(`/api/admin/places${path}`, { method, headers: { Authorization: `Bearer ${token}` } })
}

// 204 answers have no body, so `answer` (which reads JSON) is only used on errors.
async function noContent(response: Response, what: string): Promise<void> {
  if (!response.ok) await answer(response, what)
}

export async function lockPlace(token: string, placeId: number): Promise<void> {
  await noContent(await call(token, 'POST', `/${placeId}/lock`), 'POST lock place')
}

export async function unlockPlace(token: string, placeId: number): Promise<void> {
  await noContent(await call(token, 'POST', `/${placeId}/unlock`), 'POST unlock place')
}

export async function deletePlace(token: string, placeId: number): Promise<void> {
  await noContent(await call(token, 'DELETE', `/${placeId}`), 'DELETE place')
}

export async function fetchLockedPlaces(token: string): Promise<LockedPlace[]> {
  return answer(await call(token, 'GET', '/locked'), 'GET locked places')
}
