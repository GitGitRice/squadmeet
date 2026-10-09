// Privacy page and imprint (SCRUM-28). Own URLs, so a link works without login and from outside.
export const PRIVACY_PATH = '/datenschutz'
export const IMPRINT_PATH = '/impressum'

export type LegalPageKind = 'privacy' | 'imprint'

export function legalPageFromPath(path: string): LegalPageKind | null {
  const clean = path.replace(/\/$/, '')
  if (clean === PRIVACY_PATH) return 'privacy'
  if (clean === IMPRINT_PATH) return 'imprint'
  return null
}

// The person responsible for the site (imprint, and "Verantwortlicher" on the privacy page).
// Until the handover (SCRUM-48) this is Steven; afterwards Stefan.
export const RESPONSIBLE = {
  name: 'TODO Vorname Nachname',
  street: 'TODO Straße Nr.',
  city: 'TODO PLZ Ort',
  email: 'TODO kontakt@example.org',
}
