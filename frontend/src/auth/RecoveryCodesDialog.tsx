import { useState, type FormEvent } from 'react'
import { newRecoveryCodes, type User } from '../api/auth'
import RecoveryCodes from './RecoveryCodes'

type Props = {
  token: string
  user: User
  onClose: () => void
}

/** A new set of Recovery codes; the old set stops working (SCRUM-33). */
export default function RecoveryCodesDialog({ token, user, onClose }: Props) {
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      setCodes(await newRecoveryCodes(token, password, user.mfa_enabled ? code : undefined))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (codes) {
    return <RecoveryCodes codes={codes} replaced onConfirmed={onClose} />
  }

  return (
    <div className="dialog-backdrop">
      <form className="dialog" onSubmit={submit}>
        <h2>Neue Wiederherstellungscodes</h2>
        <p>
          Du bekommst 10 neue Codes. Deine alten Codes gelten danach nicht mehr, auch die noch
          nicht benutzten.
        </p>
        <label>
          Passwort
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            autoComplete="current-password"
          />
        </label>
        {user.mfa_enabled && (
          <label>
            Code aus der App oder Wiederherstellungscode
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoComplete="one-time-code"
              placeholder="123456"
            />
          </label>
        )}

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={busy}>
          Neue Codes erstellen
        </button>
        <button type="button" className="link" onClick={onClose}>
          Abbrechen
        </button>
      </form>
    </div>
  )
}
