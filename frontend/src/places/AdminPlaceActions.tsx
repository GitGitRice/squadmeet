import { useState } from 'react'
import { deletePlace, lockPlace } from '../api/admin'
import { loadToken } from '../api/auth'

type Action = 'lock' | 'delete'

type Props = {
  placeId: number
  // The Place is gone from the map: the parent closes the detail and loads the map again.
  onRemoved: () => void
}

const QUESTIONS: Record<Action, string> = {
  lock: 'Platz sperren? Er verschwindet von der Karte, kommende Treffen werden abgesagt und laufende beendet. Du kannst ihn wieder entsperren.',
  delete: 'Platz endgültig löschen? Wie Sperren, aber er kommt nicht zurück, auch nicht beim nächsten OSM-Import.',
}

/** Admin part of the Place detail (SCRUM-39): lock or delete, each with a second step. */
export default function AdminPlaceActions({ placeId, onRemoved }: Props) {
  const [asking, setAsking] = useState<Action | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: Action) {
    setBusy(true)
    setError(null)
    try {
      const token = loadToken() ?? ''
      await (action === 'lock' ? lockPlace(token, placeId) : deletePlace(token, placeId))
      onRemoved()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="admin-box" aria-label="Admin">
      <strong>Admin</strong>
      {asking ? (
        <>
          <p>{QUESTIONS[asking]}</p>
          <div className="admin-buttons">
            <button type="button" className="danger" disabled={busy} onClick={() => run(asking)}>
              {asking === 'lock' ? 'Ja, sperren' : 'Ja, löschen'}
            </button>
            <button type="button" disabled={busy} onClick={() => setAsking(null)}>
              Abbrechen
            </button>
          </div>
        </>
      ) : (
        <div className="admin-buttons">
          <button type="button" onClick={() => setAsking('lock')}>
            Platz sperren
          </button>
          <button type="button" className="danger" onClick={() => setAsking('delete')}>
            Platz löschen
          </button>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
