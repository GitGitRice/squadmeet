import { useState, type ReactNode } from 'react'
import { loadToken, type User } from '../api/auth'
import type { Place } from '../api/places'
import { CONFIRMATIONS_NEEDED, confirmPlace, locate } from '../api/suggestions'
import { activityOf } from './activities'

type Props = {
  place: Place | null
  error: string | null
  onRetry: () => void
  onClose: () => void
  user?: User | null
  onLoginNeeded?: () => void
  onConfirmed?: (place: Place) => void
  // The Meetups (SCRUM-29) and Ratings (SCRUM-31) parts, shown once the Place is loaded.
  // Not for a Place suggestion.
  children?: ReactNode
}

// The Place detail page: a panel over the bottom of the map (layout from SCRUM-17), so the
// map still shows where the Place is.
export default function PlaceDetail({
  place,
  error,
  onRetry,
  onClose,
  user,
  onLoginNeeded,
  onConfirmed,
  children,
}: Props) {
  const activity = place && activityOf(place.activity_type)
  const coordinates = place && `${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}`
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<{ placeId: number; message: string } | null>(null)
  const currentConfirmError =
    place && confirmError?.placeId === place.id ? confirmError.message : null

  async function handleConfirm() {
    if (!place) return
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
      setConfirmError({ placeId: place.id, message: (err as Error).message })
    } finally {
      setConfirming(false)
    }
  }

  return (
    <section className="place-detail" aria-label={place?.name ?? 'Platz'}>
      <div className="place-detail-head">
        {activity && (
          <span className="place-detail-emoji" style={{ borderColor: activity.color }} aria-hidden="true">
            {activity.emoji}
          </span>
        )}
        <div className="place-detail-title">
          <h2>{place?.name ?? (error ? 'Platz nicht gefunden' : 'Lädt …')}</h2>
          {activity && <span>{activity.label}</span>}
        </div>
      </div>

      {place?.is_suggestion && (
        <div className="suggestion-box">
          <p className="suggestion-note">
            <strong>Vorschlag, noch nicht bestätigt:</strong> {place.confirmations} von {CONFIRMATIONS_NEEDED}{' '}
            Bestätigungen. Treffen und Bewertungen sind erst an bestätigten Plätzen möglich.
          </p>
          <button type="button" className="confirm-button" disabled={confirming} onClick={handleConfirm}>
            {confirming ? 'Standort wird geprüft …' : '📍 Vor Ort bestätigen'}
          </button>
          {currentConfirmError && <p className="form-error">{currentConfirmError}</p>}
        </div>
      )}
      {place && !place.is_suggestion && place.confirmations > 0 && (
        <p className="user-added-note">Von Nutzern hinzugefügt</p>
      )}
      {place && (
        <p className="place-detail-location">
          Lage: {coordinates}{' '}
          <a
            href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=18/${place.lat}/${place.lon}`}
            target="_blank"
            rel="noreferrer"
          >
            in OpenStreetMap ansehen
          </a>
        </p>
      )}
      {place && !place.is_suggestion && children}
      {error && (
        <>
          <p className="form-error">{error}</p>
          <button type="button" className="place-detail-retry" onClick={onRetry}>
            Nochmal versuchen
          </button>
        </>
      )}

      <a
        className="place-detail-back"
        href="/"
        onClick={(event) => {
          event.preventDefault()
          onClose()
        }}
      >
        ‹ Zurück zur Karte
      </a>
    </section>
  )
}

