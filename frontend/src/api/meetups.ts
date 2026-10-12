// Meetups: Now-meetups (SCRUM-29) and later Meetups (SCRUM-35), the API of backend/app/meetups.py.

import { answer } from './http'

export type MeetupHost = { id: number; nickname: string; avatar: string }

export type Meetup = {
  id: number
  place_id: number
  host: MeetupHost
  // The Host's Party size, the Host included.
  party_size: number
  // ISO 8601 with time zone, e.g. "2026-10-12T09:00:00Z".
  starts_at: string
  ends_at: string
}

// Without starts_at a Now-meetup; with it a later Meetup (ISO 8601 with time zone).
export type MeetupInput = { place_id: number; hours: number; party_size: number; starts_at?: string }

export async function fetchMeetups(placeId: number): Promise<Meetup[]> {
  return answer(await fetch(`/api/places/${placeId}/meetups`), 'GET meetups')
}

export async function createMeetup(token: string, input: MeetupInput): Promise<Meetup> {
  const response = await fetch('/api/meetups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
  return answer(response, 'POST meetup')
}

export async function endMeetup(token: string, meetupId: number): Promise<Meetup> {
  const response = await fetch(`/api/meetups/${meetupId}/end`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  return answer(response, 'POST end meetup')
}

// The Host moves the start of a Meetup that has not started yet; the duration stays.
export async function moveMeetupStart(token: string, meetupId: number, startsAt: string): Promise<Meetup> {
  const response = await fetch(`/api/meetups/${meetupId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ starts_at: startsAt }),
  })
  return answer(response, 'PATCH meetup')
}
