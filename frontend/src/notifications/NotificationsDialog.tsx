import { useCallback, useEffect, useState } from 'react'
import {
  fetchNotifications,
  markNotificationRead,
  type Notification,
  type NotificationKind,
} from '../api/notifications'

type Props = {
  token: string
  onChanged: (notifications: Notification[]) => void
  onOpenMeetup: (placeId: number) => void
  onClose: () => void
}

const when = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const messages: Record<NotificationKind, (place: string) => string> = {
  meetup_cancelled: (place) => `Das Treffen bei „${place}“ wurde abgesagt.`,
  meetup_ended: (place) => `Das Treffen bei „${place}“ wurde wegen einer Platzsperrung beendet.`,
  host_handover: (place) => `Du bist jetzt Gastgeber des Treffens bei „${place}“.`,
  blocked_user_joined: (place) =>
    `Jemand, den du blockiert hast, ist dem Treffen bei „${place}“ beigetreten.`,
}

export default function NotificationsDialog({ token, onChanged, onOpenMeetup, onClose }: Props) {
  const [data, setData] = useState<Notification[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(
    () =>
      fetchNotifications(token)
        .then((found) => {
          setData(found)
          onChanged(found)
          setError(null)
        })
        .catch((err: Error) => setError(err.message)),
    [token, onChanged],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  async function open(notice: Notification) {
    if (busy || data === null) return
    setBusy(true)
    setError(null)
    try {
      await markNotificationRead(token, notice.id)
      const updated = data.map((item) => (item.id === notice.id ? { ...item, read: true } : item))
      setData(updated)
      onChanged(updated)
      onOpenMeetup(notice.place_id)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog notifications" role="dialog" aria-label="Benachrichtigungen">
        <h2>Benachrichtigungen</h2>
        {error && <p className="form-error">{error}</p>}
        {data === null && !error && <p>Lädt …</p>}
        {data?.length === 0 && <p className="hint">Noch keine Benachrichtigungen.</p>}
        {data && data.length > 0 && (
          <ul className="notification-list">
            {data.map((notice) => (
              <li key={notice.id}>
                <button
                  type="button"
                  className={notice.read ? '' : 'unread'}
                  disabled={busy}
                  onClick={() => open(notice)}
                >
                  <strong>{messages[notice.kind](notice.place_name)}</strong>
                  {notice.place_address && <span>{notice.place_address}</span>}
                  <time dateTime={notice.created_at}>{when.format(new Date(notice.created_at))} Uhr</time>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="link" onClick={onClose}>
          Schließen
        </button>
      </div>
    </div>
  )
}
