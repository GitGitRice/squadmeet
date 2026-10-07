// PROTOTYPE (SCRUM-17): test data and Meetup rules in memory. No API, nothing is saved.
// The real rules come with SCRUM-29, -34, -35, -37 and -38; see CONTEXT.md for the terms.

export type User = { id: string; nickname: string; avatar: string }

export type ProtoPlace = { id: number; name: string; activity: string; lat: number; lon: number }

export type Join = { userId: string; partySize: number; joinedAt: number }

export type MeetupState = 'active' | 'ended' | 'cancelled' | 'closed'

export type Meetup = {
  id: number
  placeId: number
  kind: 'now' | 'later'
  start: number
  // Only a Now-meetup has an end: 1–4 hours after the start.
  end?: number
  // The weekly times of the Series this Meetup is an Occurrence of.
  series?: SeriesSlot[]
  hostId: string
  // The Host is in this list too, with their own Party size.
  joins: Join[]
  state: MeetupState
}

export type SeriesSlot = { weekday: number; time: string }

export const ACTIVITIES: Record<string, { emoji: string; label: string }> = {
  table_tennis: { emoji: '🏓', label: 'Tischtennis' },
  basketball: { emoji: '🏀', label: 'Basketball' },
  football: { emoji: '⚽', label: 'Fußball' },
  beach_volleyball: { emoji: '🏐', label: 'Beachvolleyball' },
  outdoor_fitness: { emoji: '💪', label: 'Outdoor-Fitness' },
}

export const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

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
const DAY = 24 * HOUR

export function userById(id: string): User {
  return USERS.find((u) => u.id === id)!
}

export function placeById(id: number): ProtoPlace {
  return PLACES.find((p) => p.id === id)!
}

export function partyTotal(meetup: Meetup): number {
  return meetup.joins.reduce((sum, j) => sum + j.partySize, 0)
}

// The next dates of a weekly Series, for the next two weeks.
function occurrenceStarts(slots: SeriesSlot[], from: number): number[] {
  const starts: number[] = []
  for (let day = 0; day < 14; day++) {
    const date = new Date(from + day * DAY)
    for (const slot of slots) {
      if (date.getDay() !== slot.weekday) continue
      const [h, m] = slot.time.split(':').map(Number)
      date.setHours(h, m, 0, 0)
      if (date.getTime() > from) starts.push(date.getTime())
    }
  }
  return starts.sort((a, b) => a - b)
}

export type State = { me: string; meetups: Meetup[]; nextId: number }

export type Action =
  | { type: 'setMe'; userId: string }
  | { type: 'createNow'; placeId: number; hours: number; partySize: number }
  | { type: 'createLater'; placeId: number; start: number; partySize: number }
  | { type: 'createSeries'; placeId: number; slots: SeriesSlot[]; partySize: number }
  | { type: 'join'; meetupId: number; partySize: number }
  | { type: 'leave'; meetupId: number }
  | { type: 'cancel'; meetupId: number }
  | { type: 'endNow'; meetupId: number }

function newMeetup(state: State, placeId: number, start: number, partySize: number): Meetup {
  return {
    id: state.nextId,
    placeId,
    kind: 'later',
    start,
    hostId: state.me,
    joins: [{ userId: state.me, partySize, joinedAt: Date.now() }],
    state: 'active',
  }
}

function update(state: State, id: number, change: (m: Meetup) => Meetup): State {
  return { ...state, meetups: state.meetups.map((m) => (m.id === id ? change(m) : m)) }
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setMe':
      return { ...state, me: action.userId }
    case 'createNow': {
      const now = Date.now()
      const meetup = { ...newMeetup(state, action.placeId, now, action.partySize), kind: 'now' as const, end: now + action.hours * HOUR }
      return { ...state, meetups: [...state.meetups, meetup], nextId: state.nextId + 1 }
    }
    case 'createLater': {
      const meetup = newMeetup(state, action.placeId, action.start, action.partySize)
      return { ...state, meetups: [...state.meetups, meetup], nextId: state.nextId + 1 }
    }
    case 'createSeries': {
      // Each Occurrence is its own Meetup: users join Occurrences, not the Series.
      const starts = occurrenceStarts(action.slots, Date.now())
      const meetups = starts.map((start, i) => ({
        ...newMeetup({ ...state, nextId: state.nextId + i }, action.placeId, start, action.partySize),
        series: action.slots,
      }))
      return { ...state, meetups: [...state.meetups, ...meetups], nextId: state.nextId + starts.length }
    }
    case 'join':
      return update(state, action.meetupId, (m) => ({
        ...m,
        joins: [...m.joins, { userId: state.me, partySize: action.partySize, joinedAt: Date.now() }],
      }))
    case 'leave':
      return update(state, action.meetupId, (m) => {
        const joins = m.joins.filter((j) => j.userId !== state.me)
        // No users left: Closed. The Host left: the role passes to the earliest Join.
        if (joins.length === 0) return { ...m, joins, state: 'closed' }
        const earliest = [...joins].sort((a, b) => a.joinedAt - b.joinedAt)[0]
        return { ...m, joins, hostId: m.hostId === state.me ? earliest.userId : m.hostId }
      })
    case 'cancel':
      return update(state, action.meetupId, (m) => ({ ...m, state: 'cancelled' }))
    case 'endNow':
      return update(state, action.meetupId, (m) => ({ ...m, state: 'ended', end: Date.now() }))
  }
}

function seed(): State {
  const now = Date.now()
  const tomorrow18 = new Date(now + DAY)
  tomorrow18.setHours(18, 0, 0, 0)
  const series: SeriesSlot[] = [
    { weekday: 2, time: '19:00' },
    { weekday: 4, time: '19:00' },
  ]
  const meetups: Meetup[] = [
    {
      id: 1,
      placeId: 1,
      kind: 'now',
      start: now - 0.5 * HOUR,
      end: now + 1.5 * HOUR,
      hostId: 'steven',
      joins: [
        { userId: 'steven', partySize: 1, joinedAt: now - 0.5 * HOUR },
        { userId: 'david', partySize: 2, joinedAt: now - 0.2 * HOUR },
      ],
      state: 'active',
    },
    {
      id: 2,
      placeId: 2,
      kind: 'later',
      start: tomorrow18.getTime(),
      hostId: 'mia',
      joins: [{ userId: 'mia', partySize: 3, joinedAt: now - 2 * HOUR }],
      state: 'active',
    },
  ]
  let state: State = { me: 'stefan', meetups, nextId: 3 }
  // David's weekly football Series, built with the same rule as a new Series.
  state = reducer({ ...state, me: 'david' }, { type: 'createSeries', placeId: 3, slots: series, partySize: 1 })
  return { ...state, me: 'stefan' }
}

export const INITIAL_STATE = seed()

export const timeFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })

export function formatWhen(meetup: Meetup): string {
  if (meetup.kind === 'now') return `Jetzt, bis ${timeFormat.format(meetup.end)}`
  const sameDay = new Date(meetup.start).toDateString() === new Date().toDateString()
  return `${sameDay ? 'Heute' : dayFormat.format(meetup.start)}, ${timeFormat.format(meetup.start)}`
}

export function formatSeries(slots: SeriesSlot[]): string {
  return slots.map((s) => `${WEEKDAYS[s.weekday]} ${s.time}`).join(', ')
}

export const STATE_LABELS: Record<MeetupState, string> = {
  active: 'Aktiv',
  ended: 'Beendet',
  cancelled: 'Abgesagt',
  closed: 'Geschlossen',
}

export type TimeFilter = 'all' | 'now' | 'today' | 'later'

export const TIME_FILTERS: Record<TimeFilter, string> = { all: 'Alle', now: 'Jetzt', today: 'Heute', later: 'Später' }

// Which active Meetups the map shows for a time filter (SCRUM-35: now / today / upcoming).
export function matchesFilter(meetup: Meetup, filter: TimeFilter): boolean {
  if (meetup.state !== 'active') return false
  const isToday = new Date(meetup.start).toDateString() === new Date().toDateString()
  if (filter === 'now') return meetup.kind === 'now'
  if (filter === 'today') return meetup.kind === 'later' && isToday
  if (filter === 'later') return meetup.kind === 'later' && !isToday
  return true
}
