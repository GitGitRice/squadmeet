import { useEffect, useState } from 'react'
import { loadToken } from '../api/auth'
import { fetchContacts, type ContactUser } from '../api/contacts'
import { inviteContacts, type Meetup } from '../api/meetups'

type ChooserProps = {
  meetupId: number
  onClose: () => void
}

function invitedText(count: number): string {
  if (count === 0) return 'Alle Gewählten sind schon dabei oder eingeladen.'
  return `${count} ${count === 1 ? 'Kontakt' : 'Kontakte'} eingeladen.`
}

function toggled(chosen: Set<number>, id: number): Set<number> {
  const next = new Set(chosen)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

function ContactList({ contacts, chosen, onToggle }: {
  contacts: ContactUser[]
  chosen: Set<number>
  onToggle: (id: number) => void
}) {
  if (contacts.length === 0) return <p className="hint">Du hast noch keine Kontakte.</p>
  return (
    <ul>
      {contacts.map((contact) => (
        <li key={contact.id}>
          <label>
            <input type="checkbox" checked={chosen.has(contact.id)} onChange={() => onToggle(contact.id)} />{' '}
            {contact.nickname}
          </label>
        </li>
      ))}
    </ul>
  )
}

function ChooserButtons({ canSend, showSend, done, onSend, onClose }: {
  canSend: boolean
  showSend: boolean
  done: boolean
  onSend: () => void
  onClose: () => void
}) {
  return (
    <div className="button-row">
      {showSend && (
        <button type="button" disabled={!canSend} onClick={onSend}>
          Einladen
        </button>
      )}
      <button type="button" className="link-button" onClick={onClose}>
        {done ? 'Fertig' : 'Abbrechen'}
      </button>
    </div>
  )
}

/** The Contacts to choose; "Einladen" sends one invitation each. The server leaves out who is
 * already in the Meetup or already invited, and anyone blocked. */
function ContactChooser({ meetupId, onClose }: ChooserProps) {
  const [contacts, setContacts] = useState<ContactUser[] | null>(null)
  const [chosen, setChosen] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchContacts(loadToken() ?? '')
      .then((found) => setContacts(found.contacts))
      .catch((err: Error) => setError(err.message))
  }, [])

  async function send() {
    setBusy(true)
    setError(null)
    try {
      setDone(invitedText(await inviteContacts(loadToken() ?? '', meetupId, [...chosen])))
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
      {contacts && <ContactList contacts={contacts} chosen={chosen} onToggle={(id) => setChosen(toggled(chosen, id))} />}
      {done && <p>{done}</p>}
      {error && <p className="form-error">{error}</p>}
      <ChooserButtons
        canSend={!busy && chosen.size > 0}
        showSend={!!contacts?.length}
        done={done !== null}
        onSend={send}
        onClose={onClose}
      />
    </div>
  )
}

/** "Kontakte einladen" on a Meetup card (SCRUM-43), for everyone in the Meetup (action
 * "invite"). Invited Contacts get a Notification with "Ich komme mit". */
export default function InviteContacts({ meetup }: { meetup: Pick<Meetup, 'id' | 'actions'> }) {
  const [open, setOpen] = useState(false)
  if (!meetup.actions.includes('invite')) return null
  if (open) return <ContactChooser meetupId={meetup.id} onClose={() => setOpen(false)} />
  return (
    <button type="button" onClick={() => setOpen(true)}>
      Kontakte einladen
    </button>
  )
}
