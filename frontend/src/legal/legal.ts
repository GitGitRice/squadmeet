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
// Stefan, the product owner (decided 2026-10-12), also before the handover (SCRUM-48).
export const RESPONSIBLE = {
  name: 'Stefan Kallinich',
  street: 'Elsterstraße 44',
  city: '04109 Leipzig',
  email: 'stefankallinich@gmx.de',
}
