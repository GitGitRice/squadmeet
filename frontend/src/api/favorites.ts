import { answer } from './http'

export type FavoriteTimeRule = {
  id: number
  weekdays: number[]
  start: string
  end: string
}

export type Favorite = {
  id: number
  place: { id: number; name: string; address: string | null }
  rules: FavoriteTimeRule[]
}

const headers = (token: string, json = false) => ({
  Authorization: `Bearer ${token}`,
  ...(json ? { 'Content-Type': 'application/json' } : {}),
})

export async function fetchFavorites(token: string): Promise<Favorite[]> {
  return answer(await fetch('/api/favorites', { headers: headers(token) }), 'GET favorites')
}

export async function fetchFavorite(token: string, placeId: number): Promise<Favorite | null> {
  return answer(
    await fetch(`/api/places/${placeId}/favorite`, { headers: headers(token) }),
    'GET favorite',
  )
}

export async function addFavorite(token: string, placeId: number): Promise<Favorite> {
  return answer(
    await fetch(`/api/places/${placeId}/favorite`, { method: 'PUT', headers: headers(token) }),
    'PUT favorite',
  )
}

export async function removeFavorite(token: string, placeId: number): Promise<void> {
  const response = await fetch(`/api/places/${placeId}/favorite`, {
    method: 'DELETE',
    headers: headers(token),
  })
  if (!response.ok) await answer(response, 'DELETE favorite')
}

export type TimeRuleWrite = { weekdays: number[]; start: string; end: string }

export async function addFavoriteRule(
  token: string,
  favoriteId: number,
  rule: TimeRuleWrite,
): Promise<FavoriteTimeRule> {
  return answer(
    await fetch(`/api/favorites/${favoriteId}/rules`, {
      method: 'POST',
      headers: headers(token, true),
      body: JSON.stringify(rule),
    }),
    'POST favorite rule',
  )
}

export async function editFavoriteRule(
  token: string,
  favoriteId: number,
  ruleId: number,
  rule: TimeRuleWrite,
): Promise<FavoriteTimeRule> {
  return answer(
    await fetch(`/api/favorites/${favoriteId}/rules/${ruleId}`, {
      method: 'PUT',
      headers: headers(token, true),
      body: JSON.stringify(rule),
    }),
    'PUT favorite rule',
  )
}

export async function removeFavoriteRule(
  token: string,
  favoriteId: number,
  ruleId: number,
): Promise<void> {
  const response = await fetch(`/api/favorites/${favoriteId}/rules/${ruleId}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  if (!response.ok) await answer(response, 'DELETE favorite rule')
}
