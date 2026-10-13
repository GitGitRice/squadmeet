import { canModerate } from '../api/admin'
import type { User } from '../api/auth'
import LegalLinks from '../legal/LegalLinks'

type Props = {
  user: User
  // Contact requests waiting for an answer (SCRUM-32).
  incomingRequests: number
  onContacts: () => void
  onMfa: () => void
  onDelete: () => void
  onLockedPlaces: () => void
  onClose: () => void
}

/** "Konto": the account actions in one place, so the bar on a phone stays one line (SCRUM-28). */
export default function AccountDialog({
  user,
  incomingRequests,
  onContacts,
  onMfa,
  onDelete,
  onLockedPlaces,
  onClose,
}: Props) {
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-label="Konto">
        <h2>Konto</h2>
        <button type="button" onClick={onContacts}>
          Kontakte{incomingRequests > 0 && ` (${incomingRequests} neu)`}
        </button>
        <button type="button" onClick={onMfa}>
          Zwei-Faktor-Anmeldung ({user.mfa_enabled ? 'an' : 'aus'})
        </button>
        {canModerate(user) && (
          <button type="button" onClick={onLockedPlaces}>
            Gesperrte Plätze
          </button>
        )}
        <button type="button" onClick={onDelete}>
          Konto löschen
        </button>
        <button type="button" className="link" onClick={onClose}>
          Schließen
        </button>
        <LegalLinks className="legal-links-inline" />
      </div>
    </div>
  )
}
