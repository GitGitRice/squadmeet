// PROTOTYPE (SCRUM-17): test data in memory. No API, nothing is saved.
// Only the flow of SCRUM-17: create a Now-meetup, see it on the map, open it, Join with a
// Party size, Leave, and Cancel as Host. The terms are in CONTEXT.md.

export type User = { id: string; nickname: string; avatar: string }

export type ProtoPlace = { id: number; name: string; activity: string; lat: number; lon: number }

export type Join = { userId: string; partySize: number }

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

export const ACTIVITIES: Record<string, { emoji: string; label: string }> = {
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

const HOUR = 60 * 60 * 1000

export function userById(id: string): User {
  return USERS.find((u) => u.id === id)!
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
        joins: [{ userId: state.me, partySize: action.partySize }],
        cancelled: false,
      }
      return { ...state, meetups: [...state.meetups, meetup], nextId: state.nextId + 1 }
    }
    case 'join':
      return update(state, action.meetupId, (m) => ({
        ...m,
        joins: [...m.joins, { userId: state.me, partySize: action.partySize }],
      }))
    case 'leave':
      return update(state, action.meetupId, (m) => ({ ...m, joins: m.joins.filter((j) => j.userId !== state.me) }))
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
        { userId: 'steven', partySize: 1 },
        { userId: 'david', partySize: 2 },
      ],
      cancelled: false,
    },
    {
      id: 2,
      placeId: 2,
      start: now - 0.2 * HOUR,
      end: now + 2.8 * HOUR,
      hostId: 'mia',
      joins: [{ userId: 'mia', partySize: 3 }],
      cancelled: false,
    },
  ]
  return { me: 'stefan', meetups, nextId: 3 }
}

export const INITIAL_STATE = seed()

export const timeFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })

export function formatWhen(meetup: Meetup): string {
  return `Jetzt hier, bis ${timeFormat.format(meetup.end)} Uhr`
}
