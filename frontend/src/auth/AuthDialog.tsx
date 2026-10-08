import { useState, type FormEvent } from 'react'
import {
  login,
  MfaRequiredError,
  register,
  type LoginResult,
  type RegisterResult,
} from '../api/auth'
import { AVATARS } from './avatars'

type Props = {
  onLoggedIn: (result: LoginResult) => void
  onClose: () => void
}

type Mode = 'login' | 'register'

export default function AuthDialog({ onLoggedIn, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState('fox')
  const [isAdult, setIsAdult] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [registered, setRegistered] = useState<RegisterResult | null>(null)
  // True after the server answered that this user has MFA on (SCRUM-26).
  const [needsCode, setNeedsCode] = useState(false)
  const [code, setCode] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        onLoggedIn(await login(nickname, password, needsCode ? code : undefined))
      } else {
        setRegistered(await register({ nickname, password, avatar, is_adult: isAdult }))
      }
    } catch (err) {
      if (err instanceof MfaRequiredError) setNeedsCode(true)
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (registered) {
    return (
      <RecoveryCodes
        codes={registered.recovery_codes}
        onConfirmed={() => onLoggedIn(registered)}
      />
    )
  }

  return (
    <div className="dialog-backdrop">
      <form className="dialog" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Anmelden' : 'Registrieren'}</h2>

        <label>
          Nickname
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            autoComplete="username"
            {...(mode === 'register' && {
              pattern: '[A-Za-z0-9_\\-]{3,20}',
              title: '3–20 Zeichen: Buchstaben, Ziffern, _ und -',
            })}
          />
        </label>

        <label>
          Passwort
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            {...(mode === 'register' && { minLength: 8, maxLength: 128 })}
          />
        </label>

        {mode === 'login' && needsCode && (
          <label>
            Code aus der Authenticator-App
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode="text"
              placeholder="123456"
            />
            <small>Kein Zugriff auf die App? Gib einen Wiederherstellungscode ein.</small>
          </label>
        )}

        {mode === 'register' && (
          <>
            <fieldset className="avatars">
              <legend>Avatar</legend>
              {Object.entries(AVATARS).map(([key, { emoji, label }]) => (
                <label key={key} title={label} className={key === avatar ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="avatar"
                    value={key}
                    checked={key === avatar}
                    onChange={() => setAvatar(key)}
                  />
                  <span aria-label={label}>{emoji}</span>
                </label>
              ))}
            </fieldset>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={isAdult}
                onChange={(e) => setIsAdult(e.target.checked)}
                required
              />
              Ich bin 18 Jahre oder älter
            </label>
          </>
        )}

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={busy}>
          {mode === 'login' ? 'Anmelden' : 'Registrieren'}
        </button>
        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError(null)
            setNeedsCode(false)
          }}
        >
          {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Anmelden'}
        </button>
        <button type="button" className="link" onClick={onClose}>
          Abbrechen
        </button>
      </form>
    </div>
  )
}

function RecoveryCodes({ codes, onConfirmed }: { codes: string[]; onConfirmed: () => void }) {
  const [saved, setSaved] = useState(false)

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <h2>Deine Wiederherstellungscodes</h2>
        <p>
          Mit einem dieser Codes setzt du dein Passwort zurück, wenn du es vergisst. Jeder Code
          gilt einmal. Wir zeigen sie <strong>nur jetzt</strong> an und haben keine E-Mail-Adresse
          von dir. Speichere sie an einem sicheren Ort.
        </p>
        <ul className="codes">
          {codes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <button type="button" onClick={() => navigator.clipboard?.writeText(codes.join('\n'))}>
          Codes kopieren
        </button>
        <label className="checkbox">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          Ich habe die Codes sicher gespeichert
        </label>
        <button type="button" disabled={!saved} onClick={onConfirmed}>
          Weiter
        </button>
      </div>
    </div>
  )
}
