import { useState } from 'react'
import { loadToken, type User } from '../api/auth'
import type { Place } from '../api/places'
import { CONFIRMATIONS_NEEDED, confirmPlace, locate } from '../api/suggestions'

type Props = {
  place: Place
  user?: User | null
  onLoginNeeded?: () => void
  onConfirmed?: (place: Place) => void
}

/** The Place detail part for a Place that users added: a Place suggestion with its
 * Confirmations and the confirm button (SCRUM-30, SCRUM-36), a suggestion that waits for an
 * Admin (SCRUM-56), or "Von Nutzern hinzugefügt" once it is a Place. The parent gives it
 * key={place.id}, so an error of one Place does not show at the next. */
export default function SuggestionStatus({ place, user, onLoginNeeded, onConfirmed }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  async function handleConfirm() {
    const token = loadToken()
    if (!user || !token) {
      onLoginNeeded?.()
      return
    }
    setConfirming(true)
    setConfirmError(null)
    try {
      const position = await locate()
      const updated = await confirmPlace(token, place.id, { lat: position.lat, lon: position.lon })
      onConfirmed?.(updated)
    } catch (err) {
      setConfirmError((err as Error).message)
    } finally {
      setConfirming(false)
    }
  }

  if (place.waiting_for_admin) {
    return (
      <p className="suggestion-note">
        <strong>Vorschlag, wartet auf Freigabe:</strong> {place.confirmations} von {CONFIRMATIONS_NEEDED}{' '}
        Bestätigungen. Ein Admin prüft den Platz, bevor er freigeschaltet wird. Treffen und Bewertungen sind erst
        danach möglich.
      </p>
    )
  }
  if (place.is_suggestion) {
    return (
      <div className="suggestion-box">
        <p className="suggestion-note">
          <strong>Vorschlag, noch nicht bestätigt:</strong> {place.confirmations} von {CONFIRMATIONS_NEEDED}{' '}
          Bestätigungen. Treffen und Bewertungen sind erst an bestätigten Plätzen möglich.
        </p>
        <button type="button" className="confirm-button" disabled={confirming} onClick={handleConfirm}>
          {confirming ? 'Standort wird geprüft …' : '📍 Vor Ort bestätigen'}
        </button>
        {confirmError && <p className="form-error">{confirmError}</p>}
      </div>
    )
  }
  return place.confirmations > 0 ? <p className="user-added-note">Von Nutzern hinzugefügt</p> : null
}
