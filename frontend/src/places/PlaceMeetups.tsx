import { useCallback, useEffect, useState } from 'react'
import type { User } from '../api/auth'
import { loadToken } from '../api/auth'
import { createNowMeetup, endMeetup, fetchMeetups, type Meetup } from '../api/meetups'
import { AVATARS } from '../auth/avatars'

type Props = {
  placeId: number
  user: User | null
  onLoginNeeded: () => void
  // Called after a Meetup was created or ended, so the map can show the new state.
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

// The Meetups part of the Place detail (SCRUM-29), as in the prototype (SCRUM-17): the list of
// active Meetups and the "Ich bin jetzt hier" form. Joining is SCRUM-34.
export default function PlaceMeetups({ placeId, user, onLoginNeeded, onChanged }: Props) {
  const [meetups, setMeetups] = useState<Meetup[]>([])
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [hours, setHours] = useState(2)
  const [partySize, setPartySize] = useState(1)
  const [busy, setBusy] = useState(false)
  // When the form was opened; the shown end time is counted from here.
  const [openedAt, setOpenedAt] = useState(0)

  const reload = useCallback(() => {
    fetchMeetups(placeId)
      .then((found) => {
        setMeetups(found)
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
  }, [placeId])

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
      setCreating(false)
      reload()
      onChanged()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function startCreating() {
    if (!user) {
      onLoginNeeded()
      return
    }
    setHours(2)
    setPartySize(1)
    setOpenedAt(Date.now())
    setCreating(true)
  }

  return (
    <div className="place-meetups">
      {creating ? (
        <form
          className="now-form"
          onSubmit={(event) => {
            event.preventDefault()
            run((token) => createNowMeetup(token, { place_id: placeId, hours, party_size: partySize }))
          }}
        >
          <h3>Ich bin jetzt hier</h3>
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
          <div className="stepper" role="group" aria-label="Personenzahl (mit dir)">
            <span>Personenzahl (mit dir)</span>
            <button
              type="button"
              aria-label="Eine Person weniger"
              disabled={partySize <= 1}
              onClick={() => setPartySize(partySize - 1)}
            >
              −
            </button>
            <output>{partySize}</output>
            <button
              type="button"
              aria-label="Eine Person mehr"
              disabled={partySize >= MAX_PARTY_SIZE}
              onClick={() => setPartySize(partySize + 1)}
            >
              +
            </button>
          </div>
          <p className="hint">Alle sehen dich auf der Karte bis {time.format(openedAt + hours * 3_600_000)} Uhr.</p>
          <button type="submit" className="now-button" disabled={busy}>
            📍 Jetzt auf die Karte
          </button>
          <button type="button" className="link-button" onClick={() => setCreating(false)}>
            Abbrechen
          </button>
        </form>
      ) : (
        <button type="button" className="now-button" onClick={startCreating}>
          📍 Ich bin jetzt hier
        </button>
      )}

      {error && <p className="form-error">{error}</p>}

      <h3>Treffen hier</h3>
      {meetups.length === 0 && <p className="hint">Gerade ist niemand hier.</p>}
      <ul className="meetup-list">
        {meetups.map((meetup) => {
          const isHost = user?.id === meetup.host.id
          return (
            <li key={meetup.id} className="meetup-card">
              <div>
                <span className="live">LIVE</span> bis {time.format(new Date(meetup.ends_at))} Uhr
                <br />
                {AVATARS[meetup.host.avatar]?.emoji} {meetup.host.nickname}
                {isHost && ' (du, Gastgeber)'}
              </div>
              <strong className="meetup-people">{people(meetup.party_size)}</strong>
              {isHost && (
                <button type="button" disabled={busy} onClick={() => run((token) => endMeetup(token, meetup.id))}>
                  Jetzt beenden
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
