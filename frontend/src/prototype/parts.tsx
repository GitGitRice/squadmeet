// PROTOTYPE (SCRUM-17): the parts of the bottom sheet. No polish beyond what the team must judge.
import { useState, type Dispatch } from 'react'
import { AVATARS } from '../auth/avatars'
import {
  ACTIVITIES,
  STATE_LABELS,
  USERS,
  WEEKDAYS,
  formatSeries,
  formatWhen,
  partyTotal,
  placeById,
  timeFormat,
  userById,
  type Action,
  type Meetup,
  type SeriesSlot,
  type State,
} from './data'

const HOUR = 60 * 60 * 1000

// Party size 1–10 with big − / + buttons instead of a small select.
export function PartySize({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="pt-field">
      <span className="pt-label">Personenzahl (mit dir)</span>
      <div className="pt-stepper">
        <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Eine Person weniger">
          −
        </button>
        <output>{value}</output>
        <button type="button" onClick={() => onChange(Math.min(10, value + 1))} disabled={value >= 10} aria-label="Eine Person mehr">
          +
        </button>
      </div>
    </div>
  )
}

export function MeetupCard({ meetup, me, onOpen }: { meetup: Meetup; me: string; onOpen: () => void }) {
  const host = userById(meetup.hostId)
  const joined = meetup.joins.some((j) => j.userId === me)
  return (
    <button type="button" className={`pt-card ${meetup.kind} state-${meetup.state}`} onClick={onOpen}>
      <span className="pt-card-main">
        <span className="pt-card-when">
          {meetup.kind === 'now' && meetup.state === 'active' && <span className="pt-live">LIVE</span>}
          {formatWhen(meetup)}
        </span>
        <span className="pt-card-sub">
          {AVATARS[host.avatar].emoji} {host.nickname}
          {meetup.series && ' · jede Woche'}
          {meetup.state !== 'active' && ` · ${STATE_LABELS[meetup.state]}`}
          {joined && meetup.state === 'active' && ' · du bist dabei'}
        </span>
      </span>
      <span className="pt-count" aria-label={`${partyTotal(meetup)} Personen`}>
        {partyTotal(meetup)}
        <small>Pers.</small>
      </span>
    </button>
  )
}

export function MeetupDetail({
  meetup,
  state,
  dispatch,
  notify,
}: {
  meetup: Meetup
  state: State
  dispatch: Dispatch<Action>
  notify: (text: string) => void
}) {
  const [partySize, setPartySize] = useState(1)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const place = placeById(meetup.placeId)
  const isHost = meetup.hostId === state.me
  const myJoin = meetup.joins.find((j) => j.userId === state.me)
  const nextHost = meetup.joins.filter((j) => j.userId !== state.me).sort((a, b) => a.joinedAt - b.joinedAt)[0]

  function act(action: Action, text: string) {
    dispatch(action)
    notify(text)
  }

  return (
    <div className="pt-detail">
      <div className={`pt-status ${meetup.state === 'active' ? meetup.kind : meetup.state}`}>
        {meetup.state === 'active' ? (meetup.kind === 'now' ? '● Jetzt hier' : 'Geplantes Treffen') : STATE_LABELS[meetup.state]}
      </div>
      <h2 className="pt-when">{formatWhen(meetup)}</h2>
      <p className="pt-muted">
        {ACTIVITIES[place.activity].emoji} {place.name}
        {meetup.series && (
          <>
            <br />
            Termin einer Serie: {formatSeries(meetup.series)}
          </>
        )}
      </p>

      <h3 className="pt-h3">
        Wer kommt <span className="pt-total">{partyTotal(meetup)} Personen</span>
      </h3>
      <ul className="pt-people">
        {meetup.joins.map((j) => {
          const user = userById(j.userId)
          return (
            <li key={j.userId}>
              <span className="pt-avatar">{AVATARS[user.avatar].emoji}</span>
              <span className="pt-name">
                {user.nickname}
                {j.userId === state.me && ' (du)'}
              </span>
              {j.partySize > 1 && <span className="pt-plus">+{j.partySize - 1}</span>}
              {j.userId === meetup.hostId && <span className="pt-host">Gastgeber</span>}
            </li>
          )
        })}
        {meetup.joins.length === 0 && <li className="pt-muted">Niemand mehr dabei</li>}
      </ul>

      {meetup.state === 'active' && (
        <div className="pt-actions">
          {!myJoin && (
            <>
              <PartySize value={partySize} onChange={setPartySize} />
              <button
                type="button"
                className="pt-btn primary"
                onClick={() => act({ type: 'join', meetupId: meetup.id, partySize }, 'Du kommst mit. Der Gastgeber sieht dich in der Liste.')}
              >
                Ich komme mit
              </button>
            </>
          )}
          {myJoin && !isHost && <p className="pt-joined">✓ Du bist dabei</p>}
          {isHost && meetup.kind === 'now' && (
            <button type="button" className="pt-btn" onClick={() => act({ type: 'endNow', meetupId: meetup.id }, 'Treffen beendet.')}>
              Jetzt beenden
            </button>
          )}
          {myJoin && (
            <button
              type="button"
              className="pt-btn"
              onClick={() =>
                act(
                  { type: 'leave', meetupId: meetup.id },
                  isHost && nextHost
                    ? `Du bist raus. ${userById(nextHost.userId).nickname} ist jetzt Gastgeber.`
                    : nextHost
                      ? 'Du bist raus.'
                      : 'Du warst der letzte. Das Treffen ist geschlossen.',
                )
              }
            >
              Verlassen
              {isHost && (
                <small>{nextHost ? `${userById(nextHost.userId).nickname} wird Gastgeber` : 'Treffen wird geschlossen'}</small>
              )}
            </button>
          )}
          {isHost &&
            (confirmCancel ? (
              <div className="pt-confirm">
                <p>Für alle absagen? Alle Mitkommenden sehen es als abgesagt.</p>
                <button type="button" className="pt-btn danger" onClick={() => act({ type: 'cancel', meetupId: meetup.id }, 'Treffen abgesagt.')}>
                  Ja, absagen
                </button>
                <button type="button" className="pt-btn" onClick={() => setConfirmCancel(false)}>
                  Nein
                </button>
              </div>
            ) : (
              <button type="button" className="pt-btn danger-outline" onClick={() => setConfirmCancel(true)}>
                Absagen
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

export function NowForm({ onSubmit }: { onSubmit: (hours: number, partySize: number) => void }) {
  const [hours, setHours] = useState(2)
  const [partySize, setPartySize] = useState(1)
  const [openedAt] = useState(Date.now)
  return (
    <div className="pt-form">
      <h2 className="pt-when">Ich bin jetzt hier</h2>
      <div className="pt-field">
        <span className="pt-label">Wie lange bist du da?</span>
        <div className="pt-segments">
          {[1, 2, 3, 4].map((h) => (
            <button key={h} type="button" className={h === hours ? 'selected' : ''} onClick={() => setHours(h)}>
              {h} h
            </button>
          ))}
        </div>
      </div>
      <PartySize value={partySize} onChange={setPartySize} />
      <p className="pt-muted">Alle sehen dich auf der Karte bis {timeFormat.format(openedAt + hours * HOUR)} Uhr.</p>
      <button type="button" className="pt-btn now" onClick={() => onSubmit(hours, partySize)}>
        📍 Jetzt auf die Karte
      </button>
    </div>
  )
}

export function LaterForm({ onSubmit }: { onSubmit: (start: number | SeriesSlot[], partySize: number) => void }) {
  const [weekly, setWeekly] = useState(false)
  const [start, setStart] = useState(() => {
    const d = new Date(Date.now() + 24 * HOUR)
    d.setHours(18, 0, 0, 0)
    return toLocalInput(d)
  })
  const [slots, setSlots] = useState<SeriesSlot[]>([{ weekday: 2, time: '18:00' }])
  const [partySize, setPartySize] = useState(1)

  function toggleWeekday(weekday: number) {
    setSlots((current) =>
      current.some((s) => s.weekday === weekday)
        ? current.filter((s) => s.weekday !== weekday)
        : [...current, { weekday, time: '18:00' }].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)),
    )
  }

  return (
    <div className="pt-form">
      <h2 className="pt-when">Treffen planen</h2>
      <div className="pt-segments">
        <button type="button" className={weekly ? '' : 'selected'} onClick={() => setWeekly(false)}>
          Einmal
        </button>
        <button type="button" className={weekly ? 'selected' : ''} onClick={() => setWeekly(true)}>
          Jede Woche
        </button>
      </div>

      {!weekly && (
        <label className="pt-field">
          <span className="pt-label">Beginn</span>
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
      )}
      {weekly && (
        <div className="pt-field">
          <span className="pt-label">Wochentage</span>
          <div className="pt-segments">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <button key={d} type="button" className={slots.some((s) => s.weekday === d) ? 'selected' : ''} onClick={() => toggleWeekday(d)}>
                {WEEKDAYS[d]}
              </button>
            ))}
          </div>
          {slots.map((slot) => (
            <label key={slot.weekday} className="pt-slot">
              {WEEKDAYS[slot.weekday]} um
              <input
                type="time"
                value={slot.time}
                onChange={(e) => setSlots((current) => current.map((s) => (s.weekday === slot.weekday ? { ...s, time: e.target.value } : s)))}
              />
            </label>
          ))}
        </div>
      )}

      <PartySize value={partySize} onChange={setPartySize} />
      <button
        type="button"
        className="pt-btn primary"
        disabled={weekly && slots.length === 0}
        onClick={() => onSubmit(weekly ? slots : new Date(start).getTime(), partySize)}
      >
        Treffen ankündigen
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

// Only for the prototype: switch the person (to see the Host and the guest view) and see the state.
export function PrototypeBar({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  return (
    <details className="pt-proto">
      <summary>
        PROTOTYP · {AVATARS[userById(state.me).avatar].emoji} {userById(state.me).nickname}
      </summary>
      <div className="pt-proto-body">
        <span>Ich bin:</span>
        {USERS.map((u) => (
          <button key={u.id} type="button" className={u.id === state.me ? 'selected' : ''} onClick={() => dispatch({ type: 'setMe', userId: u.id })}>
            {AVATARS[u.avatar].emoji} {u.nickname}
          </button>
        ))}
        <details>
          <summary>Zustand</summary>
          <pre>{JSON.stringify(state.meetups, showTimes, 2)}</pre>
        </details>
      </div>
    </details>
  )
}
