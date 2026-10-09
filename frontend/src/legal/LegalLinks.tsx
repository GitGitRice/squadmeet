import { IMPRINT_PATH, PRIVACY_PATH } from './legal'

type Props = {
  // Opens the page in the app. Without it (in a dialog), the page opens in a new tab, so the
  // form keeps what the user typed.
  navigate?: (to: string) => void
  className?: string
}

/** "Datenschutz · Impressum": on every screen (SCRUM-28). */
export default function LegalLinks({ navigate, className = 'legal-links' }: Props) {
  function link(path: string, label: string) {
    if (!navigate) {
      return (
        <a href={path} target="_blank" rel="noreferrer">
          {label}
        </a>
      )
    }
    return (
      <a
        href={path}
        onClick={(event) => {
          event.preventDefault()
          navigate(path)
        }}
      >
        {label}
      </a>
    )
  }

  return (
    <nav className={className} aria-label="Rechtliches">
      {link(PRIVACY_PATH, 'Datenschutz')} · {link(IMPRINT_PATH, 'Impressum')}
    </nav>
  )
}
