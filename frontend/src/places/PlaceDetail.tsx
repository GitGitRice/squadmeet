import type { ReactNode } from 'react'
import type { Place } from '../api/places'
import { activityOf } from './activities'

type Props = {
  place: Place | null
  error: string | null
  onRetry: () => void
  onClose: () => void
  // The Meetups part (SCRUM-29), shown once the Place is loaded.
  children?: ReactNode
}

// The Place detail page: a panel over the bottom of the map (layout from SCRUM-17), so the
// map still shows where the Place is.
export default function PlaceDetail({ place, error, onRetry, onClose, children }: Props) {
  const activity = place && activityOf(place.activity_type)
  const coordinates = place && `${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}`

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
      {place && children}
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
