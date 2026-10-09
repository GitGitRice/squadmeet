// Now-meetups (SCRUM-29): the API of backend/app/meetups.py.

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

export type NowMeetupInput = { place_id: number; hours: number; party_size: number }

export async function fetchMeetups(placeId: number): Promise<Meetup[]> {
  return answer(await fetch(`/api/places/${placeId}/meetups`), 'GET meetups')
}

export async function createNowMeetup(token: string, input: NowMeetupInput): Promise<Meetup> {
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
