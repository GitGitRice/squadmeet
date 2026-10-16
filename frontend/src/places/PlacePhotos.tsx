import { useEffect, useRef, useState } from 'react'
import { loadToken, type User } from '../api/auth'
import { fetchPhotos, MAX_PHOTO_BYTES, PHOTO_TYPES, uploadPhoto, type Photo } from '../api/photos'

type Props = {
  placeId: number
  user: User | null
  onLoginNeeded: () => void
}

/** "Fotos" in the Place detail (SCRUM-42): the approved Photos, and "Foto hinzufügen" from the
 * camera or the gallery (the phone offers both for a file input). A new Photo waits for an
 * Admin, so it does not show here at once. The parent gives it key={placeId}. */
export default function PlacePhotos({ placeId, user, onLoginNeeded }: Props) {
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchPhotos(placeId, loadToken())
      .then(setPhotos)
      .catch((err: Error) => setError(err.message))
  }, [placeId])

  function choose() {
    if (!user) {
      onLoginNeeded()
      return
    }
    setError(null)
    input.current?.click()
  }

  async function send(file: File) {
    if (!PHOTO_TYPES.includes(file.type)) {
      setError('Nur JPEG, PNG oder WebP')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('Das Foto ist größer als 10 MB')
      return
    }
    const token = loadToken()
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      await uploadPhoto(token, placeId, file)
      setSent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="place-photos">
      <h3>Fotos</h3>
      {photos?.length === 0 && <p className="hint">Noch keine Fotos.</p>}
      {photos && photos.length > 0 && (
        <ul className="place-photo-list">
          {photos.map((photo) => (
            <li key={photo.id}>
              <a href={photo.url} target="_blank" rel="noreferrer">
                <img src={photo.url} width={photo.width} height={photo.height} loading="lazy" alt="Foto des Platzes" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {sent && <p>Danke! Dein Foto erscheint, sobald ein Admin es freigegeben hat.</p>}
      <p className="hint">Bitte keine Personen auf den Fotos. Standortdaten im Foto werden entfernt.</p>
      <button type="button" className="link" disabled={busy} onClick={choose}>
        {busy ? 'Lädt hoch …' : 'Foto hinzufügen'}
      </button>
      <input
        ref={input}
        type="file"
        accept={PHOTO_TYPES.join(',')}
        hidden
        aria-label="Foto auswählen"
        onChange={(event) => {
          const file = event.target.files?.[0]
          // The same file can be chosen again after an error.
          event.target.value = ''
          if (file) void send(file)
        }}
      />
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
