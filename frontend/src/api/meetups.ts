// Meetups: Now-meetups (SCRUM-29), later Meetups (SCRUM-35) and Joins (SCRUM-34), the API of
// backend/app/meetups.py.

import { answer } from './http'

export type MeetupHost = { id: number; nickname: string; avatar: string }

export type Participant = MeetupHost & { party_size: number }

export type Meetup = {
  id: number
  place_id: number
  // null for a guest: only logged-in users see who comes.
  host: MeetupHost | null
  // The Host's Party size, the Host included.
  party_size: number
  // The Host's Party plus every Join.
  people: number
  // The users who joined, the earliest first; null for a guest.
  participants: Participant[] | null
  // ISO 8601 with time zone, e.g. "2026-10-12T09:00:00Z".
  starts_at: string
  ends_at: string
}

// Without starts_at a Now-meetup; with it a later Meetup (ISO 8601 with time zone).
export type MeetupInput = { place_id: number; hours: number; party_size: number; starts_at?: string }

// With a login token the answer names the Host and the participants.
export async function fetchMeetups(placeId: number, token: string | null = null): Promise<Meetup[]> {
  const url = `/api/places/${placeId}/meetups`
  const response = token ? await fetch(url, { headers: { Authorization: `Bearer ${token}` } }) : await fetch(url)
  return answer(response, 'GET meetups')
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

// "Ich komme mit" with the user's Party size.
export async function joinMeetup(token: string, meetupId: number, partySize: number): Promise<Meetup> {
  const response = await fetch(`/api/meetups/${meetupId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ party_size: partySize }),
  })
  return answer(response, 'POST join')
}

export async function leaveMeetup(token: string, meetupId: number): Promise<void> {
  const response = await fetch(`/api/meetups/${meetupId}/join`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) await answer(response, 'DELETE join')
}
