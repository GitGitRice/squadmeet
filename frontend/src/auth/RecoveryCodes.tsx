import { useState } from 'react'

type Props = {
  codes: string[]
  // True when the codes replace an older set (SCRUM-33).
  replaced?: boolean
  onConfirmed: () => void
}

/** Shows the Recovery codes once. The user must confirm that they saved them. */
export default function RecoveryCodes({ codes, replaced = false, onConfirmed }: Props) {
  const [saved, setSaved] = useState(false)

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <h2>Deine Wiederherstellungscodes</h2>
        <p>
          Mit einem dieser Codes setzt du dein Passwort zurück, wenn du es vergisst. Jeder Code
          gilt einmal. Wir zeigen sie <strong>nur jetzt</strong> an und haben keine E-Mail-Adresse
          von dir. Speichere sie an einem sicheren Ort.
          {replaced && ' Deine alten Codes gelten nicht mehr.'}
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
