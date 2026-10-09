import { useState, type FormEvent } from 'react'
import {
  CaptchaRequiredError,
  login,
  MfaRequiredError,
  register,
  resetPassword,
  type LoginResult,
  type RegisterResult,
} from '../api/auth'
import { AVATARS } from './avatars'
import RecoveryCodes from './RecoveryCodes'
import Turnstile from './Turnstile'

type Props = {
  onLoggedIn: (result: LoginResult) => void
  onClose: () => void
}

type Mode = 'login' | 'register' | 'reset'

const TITLES: Record<Mode, string> = {
  login: 'Anmelden',
  register: 'Registrieren',
  reset: 'Passwort zurücksetzen',
}

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
  // Captcha (SCRUM-27): always at registration and reset; at login after the server asked for it.
  const [loginNeedsCaptcha, setLoginNeedsCaptcha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  // A token works once, so each try gets a new widget (a new key mounts a new one).
  const [captchaRound, setCaptchaRound] = useState(0)
  const showCaptcha = mode !== 'login' || loginNeedsCaptcha

  function newCaptcha() {
    setCaptchaToken(null)
    setCaptchaRound((round) => round + 1)
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setNeedsCode(false)
    setCode('')
    setCaptchaToken(null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    const token = captchaToken ?? undefined
    try {
      if (mode === 'login') {
        onLoggedIn(await login(nickname, password, needsCode ? code : undefined, token))
      } else if (mode === 'reset') {
        const input = { nickname, code, new_password: password }
        onLoggedIn(await resetPassword({ ...input, turnstile_token: token ?? null }))
      } else {
        const input = { nickname, password, avatar, is_adult: isAdult }
        setRegistered(await register({ ...input, turnstile_token: token ?? null }))
      }
    } catch (err) {
      if (err instanceof MfaRequiredError) setNeedsCode(true)
      if (err instanceof CaptchaRequiredError) setLoginNeedsCaptcha(true)
      if (token) newCaptcha()
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
        <h2>{TITLES[mode]}</h2>

        {mode === 'reset' && (
          <p>
            Gib einen deiner Wiederherstellungscodes ein. Mit Zwei-Faktor-Anmeldung geht auch der
            Code aus deiner Authenticator-App. Ohne beides können wir dein Konto nicht
            wiederherstellen.
          </p>
        )}

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

        {mode === 'reset' && (
          <label>
            Wiederherstellungscode oder Code aus der App
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoComplete="one-time-code"
              placeholder="ABCD-EFGH-JKMN-PQRS"
            />
          </label>
        )}

        <label>
          {mode === 'reset' ? 'Neues Passwort' : 'Passwort'}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            {...(mode !== 'login' && { minLength: 8, maxLength: 128 })}
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

        {showCaptcha && <Turnstile key={`${mode}-${captchaRound}`} onToken={setCaptchaToken} />}

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={busy || (showCaptcha && !captchaToken)}>
          {TITLES[mode]}
        </button>
        <button
          type="button"
          className="link"
          onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Anmelden'}
        </button>
        {mode === 'login' && (
          <button type="button" className="link" onClick={() => switchMode('reset')}>
            Passwort vergessen?
          </button>
        )}
        <button type="button" className="link" onClick={onClose}>
          Abbrechen
        </button>
      </form>
    </div>
  )
}
