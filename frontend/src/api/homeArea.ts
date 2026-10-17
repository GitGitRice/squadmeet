// The user's Home area (SCRUM-45): a point, a radius and the Activity types for Notifications
// about new Meetups nearby. null while it is off.

import type { ActivityType } from '../places/activities'
import { answer } from './http'

export type HomeArea = {
  lat: number
  lon: number
  radius_km: number
  activity_types: ActivityType[]
}

export async function fetchHomeArea(token: string): Promise<HomeArea | null> {
  return answer(
    await fetch('/api/home-area', { headers: { Authorization: `Bearer ${token}` } }),
    'GET home area',
  )
}

export async function saveHomeArea(token: string, area: HomeArea): Promise<HomeArea> {
  return answer(
    await fetch('/api/home-area', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(area),
    }),
    'PUT home area',
  )
}

export async function turnOffHomeArea(token: string): Promise<void> {
  const response = await fetch('/api/home-area', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) await answer(response, 'DELETE home area')
}
