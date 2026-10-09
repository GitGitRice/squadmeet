import { useCallback, useEffect, useState } from 'react'
import type { User } from '../api/auth'
import { loadToken } from '../api/auth'
import {
  fetchMyRating,
  fetchRatingSummary,
  fetchReasons,
  saveRating,
  type Rating,
  type RatingSummary,
  type Reason,
  type ReasonCount,
} from '../api/ratings'

type Props = {
  placeId: number
  user: User | null
  onLoginNeeded: () => void
}

const STARS = [1, 2, 3, 4, 5]

const decimal = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function ratings(n: number): string {
  return n === 1 ? '1 Bewertung' : `${n} Bewertungen`
}

function starText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(5 - stars)
}

function ReasonChips({ reasons }: { reasons: ReasonCount[] }) {
  return (
    <ul className="reason-chips">
      {reasons.map((reason) => (
        <li key={reason.key} className={reason.positive ? 'good' : 'bad'}>
          {reason.label} <span className="reason-count">{reason.count}</span>
        </li>
      ))}
    </ul>
  )
}

function ConditionLine({ summary }: { summary: RatingSummary }) {
  const { state, issues } = summary.condition
  if (state === 'unknown') {
    return <p className="hint">Zustand: noch keine aktuellen Bewertungen.</p>
  }
  if (state === 'good') {
    return <p className="condition good">✅ Zustand: in Ordnung</p>
  }
  return (
    <div className="condition issues">
      <p>⚠️ Zustand: Mängel gemeldet</p>
      <ul>
        {issues.map((issue) => (
          <li key={issue.key}>
            {issue.label} ({issue.count}×)
          </li>
        ))}
      </ul>
    </div>
  )
}

// The Ratings part of the Place detail (SCRUM-31): average stars, the most chosen Reasons, the
// Condition, and the form to rate the Place or change the own Rating.
export default function PlaceRatings({ placeId, user, onLoginNeeded }: Props) {
  const [summary, setSummary] = useState<RatingSummary | null>(null)
  const [mine, setMine] = useState<Rating | null>(null)
  const [reasons, setReasons] = useState<Reason[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState(false)
  const [stars, setStars] = useState(0)
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => {
    fetchRatingSummary(placeId)
      .then(setSummary)
      .catch((err: Error) => setError(err.message))
  }, [placeId])

  useEffect(reload, [reload])

  // The own Rating, so the form starts with it. App gives this part a new key per user.
  useEffect(() => {
    const token = loadToken()
    if (!user || !token) return
    fetchMyRating(token, placeId)
      .then(setMine)
      .catch((err: Error) => setError(err.message))
  }, [placeId, user])

  function startRating() {
    if (!user) {
      onLoginNeeded()
      return
    }
    setStars(mine?.stars ?? 0)
    setChosen(new Set(mine?.reasons ?? []))
    setError(null)
    setRating(true)
    if (!reasons) {
      fetchReasons(placeId)
        .then(setReasons)
        .catch((err: Error) => setError(err.message))
    }
  }

  function toggle(key: string) {
    const next = new Set(chosen)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setChosen(next)
  }

  async function submit() {
    const token = loadToken()
    if (!token) {
      onLoginNeeded()
      return
    }
    setBusy(true)
    setError(null)
    try {
      // In the order of the list, not the order of the taps.
      const keys = (reasons ?? []).map((r) => r.key).filter((key) => chosen.has(key))
      setMine(await saveRating(token, placeId, { stars, reasons: keys }))
      setRating(false)
      reload()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const missing = stars === 0 ? 'Wähle 1 bis 5 Sterne.' : chosen.size === 0 ? 'Wähle mindestens eine Begründung.' : null

  function reasonGroup(title: string, positive: boolean) {
    const group = (reasons ?? []).filter((r) => r.positive === positive)
    return (
      <fieldset className="reason-group">
        <legend>{title}</legend>
        {group.map((reason) => (
          <button
            key={reason.key}
            type="button"
            aria-pressed={chosen.has(reason.key)}
            className={`${positive ? 'good' : 'bad'}${chosen.has(reason.key) ? ' on' : ''}`}
            onClick={() => toggle(reason.key)}
          >
            {reason.label}
          </button>
        ))}
      </fieldset>
    )
  }

  return (
    <div className="place-ratings">
      <h3>Bewertungen</h3>
      {summary &&
        (summary.average_stars === null ? (
          <p className="hint">Noch keine Bewertungen.</p>
        ) : (
          <p className="rating-average">
            <span className="stars" aria-hidden="true">
              {starText(Math.round(summary.average_stars))}
            </span>{' '}
            <strong>{decimal.format(summary.average_stars)}</strong> · {ratings(summary.count)}
          </p>
        ))}
      {summary && summary.top_reasons.length > 0 && <ReasonChips reasons={summary.top_reasons} />}
      {summary && <ConditionLine summary={summary} />}

      {rating ? (
        <form
          className="rating-form"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <fieldset className="star-picker">
            <legend>Wie viele Sterne?</legend>
            {STARS.map((n) => (
              <button
                key={n}
                type="button"
                aria-label={n === 1 ? '1 Stern' : `${n} Sterne`}
                aria-pressed={n === stars}
                className={n <= stars ? 'on' : ''}
                onClick={() => setStars(n)}
              >
                ★
              </button>
            ))}
          </fieldset>
          {reasons === null ? (
            <p className="hint">Lädt …</p>
          ) : (
            <>
              {reasonGroup('Was ist gut?', true)}
              {reasonGroup('Was ist nicht gut?', false)}
            </>
          )}
          {missing && <p className="hint">{missing}</p>}
          <button type="submit" className="rate-button" disabled={busy || missing !== null}>
            Bewertung speichern
          </button>
          <button type="button" className="link-button" onClick={() => setRating(false)}>
            Abbrechen
          </button>
        </form>
      ) : (
        <button type="button" className="rate-button" onClick={startRating}>
          {mine ? `Deine Bewertung ändern (${starText(mine.stars)})` : '⭐ Platz bewerten'}
        </button>
      )}

      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
