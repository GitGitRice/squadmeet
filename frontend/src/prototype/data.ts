// PROTOTYPE (SCRUM-17): test data in memory. No API, nothing is saved.
// Only the flow of SCRUM-17: create a Now-meetup, see it on the map, open it, Join with a
// Party size, Leave (the Host too: the role passes to the earliest Join), and Cancel as Host.
// The terms are in CONTEXT.md.
import { AVATARS } from '../auth/avatars'

export type User = { id: string; nickname: string; avatar: string }

export type ActivityType = 'table_tennis' | 'basketball' | 'football' | 'beach_volleyball' | 'outdoor_fitness'

export type ProtoPlace = { id: number; name: string; activity: ActivityType; lat: number; lon: number }

export type Join = { userId: string; partySize: number; joinedAt: number }

export type Meetup = {
  id: number
  placeId: number
  start: number
  end: number
  hostId: string
  // The Host is in this list too, with their own Party size.
  joins: Join[]
  cancelled: boolean
}

export const ACTIVITIES: Record<ActivityType, { emoji: string; label: string }> = {
  table_tennis: { emoji: '🏓', label: 'Tischtennis' },
  basketball: { emoji: '🏀', label: 'Basketball' },
  football: { emoji: '⚽', label: 'Fußball' },
  beach_volleyball: { emoji: '🏐', label: 'Beachvolleyball' },
  outdoor_fitness: { emoji: '💪', label: 'Outdoor-Fitness' },
}

export const USERS: User[] = [
  { id: 'stefan', nickname: 'Stefan', avatar: 'fox' },
  { id: 'steven', nickname: 'Steven', avatar: 'owl' },
  { id: 'david', nickname: 'David', avatar: 'bear' },
  { id: 'mia', nickname: 'Mia_LE', avatar: 'cat' },
]

export const PLACES: ProtoPlace[] = [
  { id: 1, name: 'Tischtennisplatte Clara-Zetkin-Park', activity: 'table_tennis', lat: 51.3317, lon: 12.3561 },
  { id: 2, name: 'Basketballplatz Johannapark', activity: 'basketball', lat: 51.3352, lon: 12.3629 },
  { id: 3, name: 'Bolzplatz Lene-Voigt-Park', activity: 'football', lat: 51.3297, lon: 12.4026 },
  { id: 4, name: 'Beachfeld Sachsenbrücke', activity: 'beach_volleyball', lat: 51.3289, lon: 12.3602 },
  { id: 5, name: 'Calisthenics Rabet', activity: 'outdoor_fitness', lat: 51.3456, lon: 12.4011 },
]

export const HOUR = 60 * 60 * 1000

export function userById(id: string): User {
  return USERS.find((u) => u.id === id)!
}

export function avatarOf(userId: string): string {
  return AVATARS[userById(userId).avatar].emoji
}

export function placeById(id: number): ProtoPlace {
  return PLACES.find((p) => p.id === id)!
}

export function partyTotal(meetup: Meetup): number {
  return meetup.joins.reduce((sum, j) => sum + j.partySize, 0)
}

export function people(n: number): string {
  return n === 1 ? '1 Person' : `${n} Personen`
}

export type State = { me: string; meetups: Meetup[]; nextId: number }

export type Action =
  | { type: 'setMe'; userId: string }
  | { type: 'create'; placeId: number; hours: number; partySize: number }
  | { type: 'join'; meetupId: number; partySize: number }
  | { type: 'leave'; meetupId: number }
  | { type: 'cancel'; meetupId: number }

// The Host can Leave only when others have joined, so this list is never empty for a Host.
export function earliestJoin(joins: Join[]): Join | undefined {
  return [...joins].sort((a, b) => a.joinedAt - b.joinedAt)[0]
}

function update(state: State, id: number, change: (m: Meetup) => Meetup): State {
  return { ...state, meetups: state.meetups.map((m) => (m.id === id ? change(m) : m)) }
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setMe':
      return { ...state, me: action.userId }
    case 'create': {
      const now = Date.now()
      const meetup: Meetup = {
        id: state.nextId,
        placeId: action.placeId,
        start: now,
        end: now + action.hours * HOUR,
        hostId: state.me,
        joins: [{ userId: state.me, partySize: action.partySize, joinedAt: now }],
        cancelled: false,
      }
      return { ...state, meetups: [...state.meetups, meetup], nextId: state.nextId + 1 }
    }
    case 'join':
      return update(state, action.meetupId, (m) => ({
        ...m,
        joins: [...m.joins, { userId: state.me, partySize: action.partySize, joinedAt: Date.now() }],
      }))
    case 'leave':
      return update(state, action.meetupId, (m) => {
        const joins = m.joins.filter((j) => j.userId !== state.me)
        // When the Host Leaves, the role passes to the user who joined earliest.
        return { ...m, joins, hostId: m.hostId === state.me ? earliestJoin(joins)!.userId : m.hostId }
      })
    case 'cancel':
      return update(state, action.meetupId, (m) => ({ ...m, cancelled: true }))
  }
}

function seed(): State {
  const now = Date.now()
  const meetups: Meetup[] = [
    {
      id: 1,
      placeId: 1,
      start: now - 0.5 * HOUR,
      end: now + 1.5 * HOUR,
      hostId: 'steven',
      joins: [
        { userId: 'steven', partySize: 1, joinedAt: now - 0.5 * HOUR },
        { userId: 'david', partySize: 2, joinedAt: now - 0.3 * HOUR },
        { userId: 'mia', partySize: 1, joinedAt: now - 0.1 * HOUR },
      ],
      cancelled: false,
    },
    {
      id: 2,
      placeId: 2,
      start: now - 0.2 * HOUR,
      end: now + 2.8 * HOUR,
      hostId: 'mia',
      joins: [{ userId: 'mia', partySize: 3, joinedAt: now - 0.2 * HOUR }],
      cancelled: false,
    },
  ]
  return { me: 'stefan', meetups, nextId: 3 }
}

export const INITIAL_STATE = seed()

export const timeFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })

export function formatWhen(meetup: Meetup): string {
  const end = timeFormat.format(meetup.end)
  return meetup.cancelled ? `Abgesagt, war bis ${end} Uhr` : `Jetzt hier, bis ${end} Uhr`
}
