// PROTOTYPE (SCRUM-17): parts that all three variants use.
import { useEffect, useState, type Dispatch } from 'react'
import { AVATARS } from '../auth/avatars'
import {
  ACTIVITIES,
  PLACES,
  STATE_LABELS,
  USERS,
  WEEKDAYS,
  formatSeries,
  formatWhen,
  partyTotal,
  placeById,
  userById,
  type Action,
  type Meetup,
  type SeriesSlot,
  type State,
} from './data'

export function PartySizeSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <label>
      Personenzahl (mit dir)
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  )
}

export function MeetupSummary({ meetup, onOpen }: { meetup: Meetup; onOpen: () => void }) {
  const place = placeById(meetup.placeId)
  const host = userById(meetup.hostId)
  return (
    <button type="button" className={`proto-summary state-${meetup.state}`} onClick={onOpen}>
      <span className="proto-emoji">{ACTIVITIES[place.activity].emoji}</span>
      <span>
        <strong>{formatWhen(meetup)}</strong>
        {meetup.series && ' · Serie'}
        <br />
        {place.name}
        <br />
        <small>
          {AVATARS[host.avatar].emoji} {host.nickname} · {partyTotal(meetup)} Personen
          {meetup.state !== 'active' && ` · ${STATE_LABELS[meetup.state]}`}
        </small>
      </span>
    </button>
  )
}

export function MeetupDetail({ meetup, state, dispatch }: { meetup: Meetup; state: State; dispatch: Dispatch<Action> }) {
  const [partySize, setPartySize] = useState(1)
  const place = placeById(meetup.placeId)
  const isHost = meetup.hostId === state.me
  const myJoin = meetup.joins.find((j) => j.userId === state.me)
  const others = meetup.joins.filter((j) => j.userId !== state.me)
  const nextHost = [...others].sort((a, b) => a.joinedAt - b.joinedAt)[0]

  return (
    <div className="proto-detail">
      <h3>
        {ACTIVITIES[place.activity].emoji} {meetup.kind === 'now' ? 'Ich bin jetzt hier' : 'Treffen'}
      </h3>
      <p>
        <strong>{formatWhen(meetup)}</strong>
        <br />
        {place.name}
        {meetup.series && (
          <>
            <br />
            Termin einer Serie: {formatSeries(meetup.series)}
          </>
        )}
      </p>
      {meetup.state !== 'active' && <p className="proto-state">{STATE_LABELS[meetup.state]}</p>}

      <h4>Wer kommt ({partyTotal(meetup)} Personen)</h4>
      <ul className="proto-people">
        {meetup.joins.map((j) => {
          const user = userById(j.userId)
          return (
            <li key={j.userId}>
              {AVATARS[user.avatar].emoji} {user.nickname}
              {j.partySize > 1 && ` +${j.partySize - 1}`}
              {j.userId === meetup.hostId && <span className="proto-badge">Gastgeber</span>}
            </li>
          )
        })}
        {meetup.joins.length === 0 && <li>Niemand mehr</li>}
      </ul>

      {meetup.state === 'active' && (
        <div className="proto-actions">
          {!myJoin && (
            <>
              <PartySizeSelect value={partySize} onChange={setPartySize} />
              <button type="button" className="primary" onClick={() => dispatch({ type: 'join', meetupId: meetup.id, partySize })}>
                Ich komme mit
              </button>
            </>
          )}
          {isHost && meetup.kind === 'now' && (
            <button type="button" onClick={() => dispatch({ type: 'endNow', meetupId: meetup.id })}>
              Jetzt beenden
            </button>
          )}
          {isHost && (
            <button type="button" className="danger" onClick={() => dispatch({ type: 'cancel', meetupId: meetup.id })}>
              Für alle absagen
            </button>
          )}
          {myJoin && (
            <button type="button" onClick={() => dispatch({ type: 'leave', meetupId: meetup.id })}>
              Verlassen
              {isHost && (nextHost ? ` (${userById(nextHost.userId).nickname} wird Gastgeber)` : ' (Treffen wird geschlossen)')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

type CreateMode = 'now' | 'later' | 'series'

// Creates a Now-meetup, a later Meetup or a Series. Without placeId the user picks the Place.
export function CreateMeetupForm({
  placeId,
  dispatch,
  onDone,
}: {
  placeId?: number
  dispatch: Dispatch<Action>
  onDone: () => void
}) {
  const [mode, setMode] = useState<CreateMode>('now')
  const [place, setPlace] = useState(placeId ?? PLACES[0].id)
  const [hours, setHours] = useState(2)
  const [start, setStart] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
    d.setHours(18, 0, 0, 0)
    return toLocalInput(d)
  })
  const [slots, setSlots] = useState<SeriesSlot[]>([{ weekday: 2, time: '18:00' }])
  const [partySize, setPartySize] = useState(1)

  function submit() {
    if (mode === 'now') dispatch({ type: 'createNow', placeId: place, hours, partySize })
    if (mode === 'later') dispatch({ type: 'createLater', placeId: place, start: new Date(start).getTime(), partySize })
    if (mode === 'series') dispatch({ type: 'createSeries', placeId: place, slots, partySize })
    onDone()
  }

  function toggleWeekday(weekday: number) {
    setSlots((current) =>
      current.some((s) => s.weekday === weekday)
        ? current.filter((s) => s.weekday !== weekday)
        : [...current, { weekday, time: '18:00' }].sort((a, b) => a.weekday - b.weekday),
    )
  }

  return (
    <div className="proto-form">
      <div className="proto-tabs">
        {(['now', 'later', 'series'] as const).map((m) => (
          <button key={m} type="button" className={m === mode ? 'selected' : ''} onClick={() => setMode(m)}>
            {{ now: 'Jetzt hier', later: 'Später', series: 'Jede Woche' }[m]}
          </button>
        ))}
      </div>

      {placeId === undefined && (
        <label>
          Platz
          <select value={place} onChange={(e) => setPlace(Number(e.target.value))}>
            {PLACES.map((p) => (
              <option key={p.id} value={p.id}>
                {ACTIVITIES[p.activity].emoji} {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {mode === 'now' && (
        <label>
          Wie lange bist du da?
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {[1, 2, 3, 4].map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? 'Stunde' : 'Stunden'}
              </option>
            ))}
          </select>
        </label>
      )}

      {mode === 'later' && (
        <label>
          Beginn
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
      )}

      {mode === 'series' && (
        <fieldset className="proto-weekdays">
          <legend>Wochentage und Uhrzeit</legend>
          {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
            const slot = slots.find((s) => s.weekday === weekday)
            return (
              <div key={weekday}>
                <label className="checkbox">
                  <input type="checkbox" checked={!!slot} onChange={() => toggleWeekday(weekday)} />
                  {WEEKDAYS[weekday]}
                </label>
                {slot && (
                  <input
                    type="time"
                    value={slot.time}
                    onChange={(e) =>
                      setSlots((current) => current.map((s) => (s.weekday === weekday ? { ...s, time: e.target.value } : s)))
                    }
                  />
                )}
              </div>
            )
          })}
        </fieldset>
      )}

      <PartySizeSelect value={partySize} onChange={setPartySize} />

      <button type="button" className="primary" onClick={submit} disabled={mode === 'series' && slots.length === 0}>
        {mode === 'now' ? 'Ich bin jetzt hier' : 'Treffen ankündigen'}
      </button>
    </div>
  )
}

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Shows the timestamps in the state dump as readable dates.
function showTimes(key: string, value: unknown) {
  return ['start', 'end', 'joinedAt'].includes(key) && typeof value === 'number'
    ? new Date(value).toLocaleString('de-DE')
    : value
}

// The bar on top: who am I (to see the Host and the guest view), and the full state.
export function PersonaBar({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  return (
    <div className="proto-persona">
      <span>PROTOTYP · Ich bin:</span>
      {USERS.map((u) => (
        <button
          key={u.id}
          type="button"
          className={u.id === state.me ? 'selected' : ''}
          onClick={() => dispatch({ type: 'setMe', userId: u.id })}
        >
          {AVATARS[u.avatar].emoji} {u.nickname}
        </button>
      ))}
      <details>
        <summary>Zustand</summary>
        <pre>{JSON.stringify(state.meetups, showTimes, 2)}</pre>
      </details>
    </div>
  )
}

export type Variant = { key: string; name: string }

// The floating bar at the bottom: switch the variant with the arrows or the ← → keys.
export function VariantSwitcher({ variants, current, onChange }: { variants: Variant[]; current: string; onChange: (key: string) => void }) {
  const index = variants.findIndex((v) => v.key === current)
  const step = (delta: number) => onChange(variants[(index + delta + variants.length) % variants.length].key)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (target.closest('input, select, textarea, [contenteditable]')) return
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="proto-switcher">
      <button type="button" onClick={() => step(-1)} aria-label="Vorige Variante">
        ←
      </button>
      <span>
        {current} ({variants[index].name})
      </span>
      <button type="button" onClick={() => step(1)} aria-label="Nächste Variante">
        →
      </button>
    </div>
  )
}
