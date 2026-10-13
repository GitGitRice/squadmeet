// City report (SCRUM-55, see CONTEXT.md): the official defect report of the city a Place is
// in. The app only links there; it sends nothing itself (ADR-0005). Checked on 2026-10-13
// against the cities' own pages. A Place belongs to the nearest of the five cities whose
// Places we import (backend/data/osm), when it is at most MAX_DISTANCE_KM away.

export type CityReport = {
  city: string
  // The office or service that receives the report.
  name: string
  url: string
  // Shown as a tel: link; null when the city names no phone number for such reports.
  phone: string | null
  phoneNote: string | null
  center: [number, number]
}

export const CITY_REPORTS: CityReport[] = [
  {
    city: 'Leipzig',
    name: 'Mängelmelder der Stadt Leipzig',
    url: 'https://mitdenken.sachsen.de/maengelmelder-L',
    phone: '0341 115',
    phoneNote: 'Bürgertelefon, Mo–Fr 7:30–18 Uhr',
    center: [51.3397, 12.3731],
  },
  {
    city: 'Erfurt',
    name: 'Mängelmelder der Landeshauptstadt Erfurt',
    url: 'https://maengelmelder.erfurt.de/',
    phone: null,
    phoneNote: null,
    center: [50.9787, 11.0328],
  },
  {
    city: 'Hannover',
    name: 'Hannover sauber! (aha) – Müll melden',
    url: 'https://app.hannover-sauber.de/',
    phone: '0800 999 11 99',
    phoneNote: 'aha-Servicetelefon, kostenlos',
    center: [52.3759, 9.732],
  },
  {
    city: 'Stuttgart',
    name: 'Gelbe Karte der Stadt Stuttgart',
    url: 'https://service.stuttgart.de/lhs-services/stoerung/',
    phone: '115',
    phoneNote: 'Behördennummer, Mo–Fr 8–18 Uhr',
    center: [48.7758, 9.1829],
  },
  {
    city: 'Potsdam',
    name: 'Mängelmelder der Landeshauptstadt Potsdam',
    url: 'https://mitgestalten.potsdam.de/de/maengel-melden',
    phone: null,
    phoneNote: null,
    center: [52.3906, 13.0645],
  },
]

// Further than this from every city center: no City report (a Place outside the five cities).
export const MAX_DISTANCE_KM = 25

function distanceKm([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const rad = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(a))
}

export function findCityReport(lat: number, lon: number): CityReport | null {
  let best: CityReport | null = null
  let bestKm = MAX_DISTANCE_KM
  for (const report of CITY_REPORTS) {
    const km = distanceKm([lat, lon], report.center)
    if (km <= bestKm) {
      best = report
      bestKm = km
    }
  }
  return best
}

// The text to copy into the city's form: the address if known, the coordinates, and a map link.
export function placeText(name: string, lat: number, lon: number, address: string | null): string {
  const where = `${lat.toFixed(5)}, ${lon.toFixed(5)}`
  const map = `https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&mlon=${lon.toFixed(5)}#map=19/${lat.toFixed(5)}/${lon.toFixed(5)}`
  return [name, address, where, map].filter(Boolean).join('\n')
}
