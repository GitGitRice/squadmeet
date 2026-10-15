import { useState } from 'react'
import { loadToken, type User } from '../api/auth'
import { REPORT_REASONS, REPORTS_TO_HIDE, reportPlace, type Place, type PlaceReportReason } from '../api/places'

type Props = {
  place: Place
  user?: User | null
  onLoginNeeded?: () => void
  // The report is saved: the parent loads the map and the detail again.
  onReported?: () => void
}

const REASONS = Object.entries(REPORT_REASONS) as [PlaceReportReason, string][]

/** Place report (SCRUM-57): the hint "Von Nutzern gemeldet" from the first open report, and
 * "Melden" with the fixed reasons. The parent gives it key={place.id}, so a choice at one Place
 * does not show at the next. */
export default function PlaceReportBox({ place, user, onLoginNeeded, onReported }: Props) {
  const [choosing, setChoosing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function start() {
    if (!user) {
      onLoginNeeded?.()
      return
    }
    setError(null)
    setChoosing(true)
  }

  async function send(reason: PlaceReportReason) {
    const token = loadToken()
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      await reportPlace(token, place.id, reason)
      setChoosing(false)
      setDone(true)
      onReported?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const reports = place.open_reports ?? 0
  return (
    <div className="place-report">
      {place.report_reason && (
        <p className="place-report-note">
          <strong>Von Nutzern gemeldet:</strong> {REPORT_REASONS[place.report_reason]}
          {/* Only an Admin sees a Place that is off the map. */}
          {reports >= REPORTS_TO_HIDE && ` (${reports} Meldungen, nicht auf der Karte)`}
        </p>
      )}
      {done && <p>Danke! Ab {REPORTS_TO_HIDE} Meldungen prüft ein Admin den Platz.</p>}
      {!done && !choosing && (
        <button type="button" className="link" onClick={start}>
          Platz melden
        </button>
      )}
      {choosing && (
        <div className="place-report-reasons" role="group" aria-label="Grund der Meldung">
          {REASONS.map(([key, label]) => (
            <button key={key} type="button" disabled={busy} onClick={() => send(key)}>
              {label}
            </button>
          ))}
          <button type="button" className="link" onClick={() => setChoosing(false)}>
            Abbrechen
          </button>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
