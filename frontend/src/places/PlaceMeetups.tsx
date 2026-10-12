import { useCallback, useEffect, useState } from 'react'
import type { User } from '../api/auth'
import { loadToken } from '../api/auth'
import {
  createMeetup,
  endMeetup,
  fetchMeetups,
  joinMeetup,
  leaveMeetup,
  moveMeetupStart,
  type Meetup,
} from '../api/meetups'
import { AVATARS } from '../auth/avatars'
import { fromInputValue, inputBounds, isLive, slot, toInputValue } from './meetupTime'

type Props = {
  placeId: number
  user: User | null
  onLoginNeeded: () => void
  // Called after a Meetup was created, moved or ended, so the map can show the new state.
  onChanged: () => void
}

const HOURS = [1, 2, 3, 4]
const MAX_PARTY_SIZE = 10
// A Meetup that ends while the panel is open leaves the list within this time.
const REFRESH_MS = 60_000

const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })

function people(n: number): string {
  return n === 1 ? '1 Person' : `${n} Personen`
}

// The next full hour, the default start of a later Meetup.
function nextFullHour(now: Date): Date {
  const next = new Date(now)
  next.setHours(next.getHours() + 1, 0, 0, 0)
  return next
}

// The Party size, the user included (1–10), for a new Meetup and for a Join.
function PartySizeStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="stepper" role="group" aria-label="Personenzahl (mit dir)">
      <span>Personenzahl (mit dir)</span>
      <button type="button" aria-label="Eine Person weniger" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        −
      </button>
      <output>{value}</output>
      <button
        type="button"
        aria-label="Eine Person mehr"
        disabled={value >= MAX_PARTY_SIZE}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}

// The Meetups part of the Place detail, as in the prototype (SCRUM-17): the active and later
// Meetups, the "Ich bin jetzt hier" form (SCRUM-29), "Später treffen" (SCRUM-35), and
// "Ich komme mit" / "Verlassen" (SCRUM-34). Guests see only the number of people.
// Cancel and the Host Leaving are SCRUM-37.
export default function PlaceMeetups({ placeId, user, onLoginNeeded, onChanged }: Props) {
  const [meetups, setMeetups] = useState<Meetup[]>([])
  const [error, setError] = useState<string | null>(null)
  // Which form is open: "Ich bin jetzt hier", "Später treffen", or none.
  const [creating, setCreating] = useState<'now' | 'later' | null>(null)
  // The start of a later Meetup, as the value of the date and time field.
  const [startsAt, setStartsAt] = useState('')
  // The Meetup whose start the Host is moving, and its new start.
  const [moving, setMoving] = useState<{ id: number; startsAt: string } | null>(null)
  // The Meetup the user is joining, and their Party size.
  const [joining, setJoining] = useState<{ id: number; partySize: number } | null>(null)
  // The time of the last load; it decides which Meetups are live.
  const [now, setNow] = useState(() => new Date())
  const [hours, setHours] = useState(2)
  const [partySize, setPartySize] = useState(1)
  const [busy, setBusy] = useState(false)
  // When the form was opened; the shown end time is counted from here.
  const [openedAt, setOpenedAt] = useState(0)

  // A guest sends no token and gets no Nicknames; after a login or logout this loads again.
  const reload = useCallback(() => {
    fetchMeetups(placeId, user ? loadToken() : null)
      .then((found) => {
        setMeetups(found)
        setNow(new Date())
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
  }, [placeId, user])

  useEffect(() => {
    reload()
    const timer = setInterval(reload, REFRESH_MS)
    return () => clearInterval(timer)
  }, [reload])

  async function run(action: (token: string) => Promise<unknown>) {
    const token = loadToken()
    if (!token) {
      onLoginNeeded()
      return
    }
    setBusy(true)
    setError(null)
    try {
      await action(token)
      setCreating(null)
      setMoving(null)
      setJoining(null)
      reload()
      onChanged()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function startCreating(kind: 'now' | 'later') {
    if (!user) {
      onLoginNeeded()
      return
    }
    setHours(2)
    setPartySize(1)
    setOpenedAt(Date.now())
    setStartsAt(toInputValue(nextFullHour(new Date())))
    setCreating(kind)
  }

  const bounds = inputBounds(new Date(openedAt))

  return (
    <div className="place-meetups">
      {creating ? (
        <form
          className="now-form"
          onSubmit={(event) => {
            event.preventDefault()
            const input = { place_id: placeId, hours, party_size: partySize }
            run((token) =>
              createMeetup(token, creating === 'later' ? { ...input, starts_at: fromInputValue(startsAt) } : input),
            )
          }}
        >
          <h3>{creating === 'later' ? 'Später treffen' : 'Ich bin jetzt hier'}</h3>
          {creating === 'later' && (
            <label className="field">
              Wann?
              <input
                type="datetime-local"
                required
                value={startsAt}
                min={bounds.min}
                max={bounds.max}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </label>
          )}
          <fieldset className="segments">
            <legend>Wie lange bist du da?</legend>
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                aria-pressed={h === hours}
                className={h === hours ? 'on' : ''}
                onClick={() => setHours(h)}
              >
                {h} h
              </button>
            ))}
          </fieldset>
          <PartySizeStepper value={partySize} onChange={setPartySize} />
          {creating === 'later' ? (
            <p className="hint">Alle sehen dein Treffen hier am Platz. Zur Startzeit erscheint es auf der Karte.</p>
          ) : (
            <p className="hint">Alle sehen dich auf der Karte bis {time.format(openedAt + hours * 3_600_000)} Uhr.</p>
          )}
          <button type="submit" className="now-button" disabled={busy}>
            {creating === 'later' ? '🗓 Treffen planen' : '📍 Jetzt auf die Karte'}
          </button>
          <button type="button" className="link-button" onClick={() => setCreating(null)}>
            Abbrechen
          </button>
        </form>
      ) : (
        <>
          <button type="button" className="now-button" onClick={() => startCreating('now')}>
            📍 Ich bin jetzt hier
          </button>
          <button type="button" className="later-button" onClick={() => startCreating('later')}>
            🗓 Später treffen
          </button>
        </>
      )}

      {error && <p className="form-error">{error}</p>}

      <h3>Treffen hier</h3>
      {meetups.length === 0 && <p className="hint">Gerade ist niemand hier.</p>}
      <ul className="meetup-list">
        {meetups.map((meetup) => {
          const isHost = user !== null && user.id === meetup.host?.id
          const joined = meetup.participants?.some((p) => p.id === user?.id) ?? false
          const live = isLive(meetup, now)
          return (
            <li key={meetup.id} className={live ? 'meetup-card' : 'meetup-card later'}>
              <div>
                {live ? (
                  <>
                    <span className="live">LIVE</span> bis {time.format(new Date(meetup.ends_at))} Uhr
                  </>
                ) : (
                  slot(meetup)
                )}
                {meetup.host && (
                  <>
                    <br />
                    {AVATARS[meetup.host.avatar]?.emoji} {meetup.host.nickname}
                    {isHost && ' (du, Gastgeber)'}
                  </>
                )}
                {meetup.participants && meetup.participants.length > 0 && (
                  <>
                    <br />
                    <span className="participants">
                      Dabei:{' '}
                      {meetup.participants
                        .map(
                          (p) =>
                            `${AVATARS[p.avatar]?.emoji ?? ''} ${p.nickname}${p.party_size > 1 ? ` (${p.party_size})` : ''}`,
                        )
                        .join(', ')}
                    </span>
                  </>
                )}
              </div>
              <strong className="meetup-people">{people(meetup.people)}</strong>
              {!isHost && !joined && joining?.id !== meetup.id && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => (user ? setJoining({ id: meetup.id, partySize: 1 }) : onLoginNeeded())}
                >
                  Ich komme mit
                </button>
              )}
              {joined && (
                <button type="button" disabled={busy} onClick={() => run((token) => leaveMeetup(token, meetup.id))}>
                  Verlassen
                </button>
              )}
              {joining?.id === meetup.id && (
                <form
                  className="move-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    run((token) => joinMeetup(token, meetup.id, joining.partySize))
                  }}
                >
                  <PartySizeStepper
                    value={joining.partySize}
                    onChange={(n) => setJoining({ id: meetup.id, partySize: n })}
                  />
                  <button type="submit" disabled={busy}>
                    Beitreten
                  </button>
                  <button type="button" className="link-button" onClick={() => setJoining(null)}>
                    Abbrechen
                  </button>
                </form>
              )}
              {isHost && live && (
                <button type="button" disabled={busy} onClick={() => run((token) => endMeetup(token, meetup.id))}>
                  Jetzt beenden
                </button>
              )}
              {/* With Joins, moving the start is SCRUM-37. */}
              {isHost && !live && meetup.participants?.length === 0 && moving?.id !== meetup.id && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setMoving({ id: meetup.id, startsAt: toInputValue(new Date(meetup.starts_at)) })}
                >
                  Zeit ändern
                </button>
              )}
              {moving?.id === meetup.id && (
                <form
                  className="move-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    run((token) => moveMeetupStart(token, meetup.id, fromInputValue(moving.startsAt)))
                  }}
                >
                  <label className="field">
                    Neuer Beginn
                    <input
                      type="datetime-local"
                      required
                      value={moving.startsAt}
                      min={inputBounds(now).min}
                      max={inputBounds(now).max}
                      onChange={(event) => setMoving({ id: meetup.id, startsAt: event.target.value })}
                    />
                  </label>
                  <button type="submit" disabled={busy}>
                    Speichern
                  </button>
                  <button type="button" className="link-button" onClick={() => setMoving(null)}>
                    Abbrechen
                  </button>
                </form>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
