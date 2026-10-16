import { useEffect, useState } from 'react'
import { loadToken } from '../api/auth'
import { fetchContacts, type ContactUser } from '../api/contacts'
import { inviteContacts } from '../api/meetups'

type Props = {
  meetupId: number
  onClose: () => void
}

/** "Kontakte einladen" (SCRUM-43): choose one or more Contacts; each gets an invitation in the
 * Notification list with "Ich komme mit". The server leaves out who is already in the Meetup or
 * already invited, and anyone blocked. */
export default function InviteContacts({ meetupId, onClose }: Props) {
  const [contacts, setContacts] = useState<ContactUser[] | null>(null)
  const [chosen, setChosen] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = loadToken()
    if (!token) return
    fetchContacts(token)
      .then((found) => setContacts(found.contacts))
      .catch((err: Error) => setError(err.message))
  }, [])

  function toggle(id: number) {
    const next = new Set(chosen)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChosen(next)
  }

  async function send() {
    const token = loadToken()
    if (!token || chosen.size === 0) return
    setBusy(true)
    setError(null)
    try {
      const count = await inviteContacts(token, meetupId, [...chosen])
      setDone(
        count === 0
          ? 'Alle Gewählten sind schon dabei oder eingeladen.'
          : `${count} ${count === 1 ? 'Kontakt' : 'Kontakte'} eingeladen.`,
      )
      setChosen(new Set())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="invite-contacts" role="group" aria-label="Kontakte einladen">
      {contacts === null && !error && <p>Lädt …</p>}
      {contacts?.length === 0 && <p className="hint">Du hast noch keine Kontakte.</p>}
      {contacts && contacts.length > 0 && (
        <ul>
          {contacts.map((contact) => (
            <li key={contact.id}>
              <label>
                <input type="checkbox" checked={chosen.has(contact.id)} onChange={() => toggle(contact.id)} />{' '}
                {contact.nickname}
              </label>
            </li>
          ))}
        </ul>
      )}
      {done && <p>{done}</p>}
      {error && <p className="form-error">{error}</p>}
      <div className="invite-contacts-actions">
        {contacts && contacts.length > 0 && (
          <button type="button" disabled={busy || chosen.size === 0} onClick={send}>
            Einladen
          </button>
        )}
        <button type="button" className="link-button" onClick={onClose}>
          {done ? 'Fertig' : 'Abbrechen'}
        </button>
      </div>
    </div>
  )
}
