import { useEffect, useState } from 'react'
import { fetchLockedPlaces, unlockPlace, type LockedPlace } from '../api/admin'
import { activityOf } from '../places/activities'

type Props = {
  token: string
  // A Place is back on the map: the parent loads the map again.
  onUnlocked: () => void
  onClose: () => void
}

/** "Gesperrte Plätze" for Admins (SCRUM-39): a locked Place is not on the map, so it is
 * unlocked from this list. */
export default function LockedPlacesDialog({ token, onUnlocked, onClose }: Props) {
  const [places, setPlaces] = useState<LockedPlace[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    fetchLockedPlaces(token)
      .then(setPlaces)
      .catch((err: Error) => setError(err.message))
  }, [token])

  async function unlock(id: number) {
    setBusyId(id)
    setError(null)
    try {
      await unlockPlace(token, id)
      setPlaces((current) => current?.filter((place) => place.id !== id) ?? null)
      onUnlocked()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-label="Gesperrte Plätze">
        <h2>Gesperrte Plätze</h2>
        {places === null && !error && <p>Lädt …</p>}
        {places?.length === 0 && <p>Kein Platz ist gesperrt.</p>}
        {places && places.length > 0 && (
          <ul className="locked-places">
            {places.map((place) => (
              <li key={place.id}>
                <span>
                  {activityOf(place.activity_type).emoji} {place.name}
                  <small>
                    {place.address ?? `Platz ${place.id}`} · gesperrt am{' '}
                    {new Date(place.locked_at).toLocaleDateString('de-DE')}
                  </small>
                </span>
                <button type="button" disabled={busyId !== null} onClick={() => unlock(place.id)}>
                  Entsperren
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="form-error">{error}</p>}
        <button type="button" className="link" onClick={onClose}>
          Schließen
        </button>
      </div>
    </div>
  )
}
