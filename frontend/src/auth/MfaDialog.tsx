import { useState, type FormEvent } from 'react'
import { mfaDisable, mfaEnable, mfaSetup, type MfaSetup, type User } from '../api/auth'

type Props = {
  token: string
  user: User
  onChanged: (user: User) => void
  onClose: () => void
}

/** Turn two-factor login with an authenticator app on or off (SCRUM-26). */
export default function MfaDialog({ token, user, onChanged, onClose }: Props) {
  const [setup, setSetup] = useState<MfaSetup | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>) {
    setError(null)
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    run(async () => {
      onChanged(await (user.mfa_enabled ? mfaDisable(token, code) : mfaEnable(token, code)))
      setSetup(null)
      setCode('')
    })
  }

  const codeField = (
    <label>
      {user.mfa_enabled ? 'Code aus der App oder Wiederherstellungscode' : 'Code aus der App'}
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
        autoFocus
        autoComplete="one-time-code"
        placeholder="123456"
      />
    </label>
  )

  return (
    <div className="dialog-backdrop">
      <form className="dialog" onSubmit={submit}>
        <h2>Zwei-Faktor-Anmeldung</h2>

        {user.mfa_enabled ? (
          <>
            <p>
              Die Zwei-Faktor-Anmeldung ist <strong>an</strong>. Beim Anmelden fragen wir nach dem
              Code aus deiner Authenticator-App.
            </p>
            {codeField}
            <button type="submit" disabled={busy}>
              Ausschalten
            </button>
          </>
        ) : setup ? (
          <>
            <p>Scanne den QR-Code mit deiner Authenticator-App (z. B. Google Authenticator).</p>
            <img className="mfa-qr" src={setup.qr_code} alt="QR-Code für die Authenticator-App" />
            <p>
              Oder gib diesen Schlüssel von Hand ein: <code className="mfa-secret">{setup.secret}</code>
            </p>
            {codeField}
            <button type="submit" disabled={busy}>
              Bestätigen und einschalten
            </button>
          </>
        ) : (
          <>
            <p>
              Mit der Zwei-Faktor-Anmeldung brauchst du beim Anmelden dein Passwort und einen Code
              aus einer Authenticator-App.
              {user.is_admin && ' Als Admin brauchst du sie für die Admin-Funktionen.'}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(async () => setSetup(await mfaSetup(token)))}
            >
              Einschalten
            </button>
          </>
        )}

        {error && <p className="form-error">{error}</p>}

        <button type="button" className="link" onClick={onClose}>
          Schließen
        </button>
      </form>
    </div>
  )
}
