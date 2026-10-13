import { describe, expect, it } from 'vitest'
import { CITY_REPORTS, findCityReport, placeText } from './cityReport'

describe('City report (SCRUM-55)', () => {
  it('has an official https target with a name for each of the five cities', () => {
    expect(CITY_REPORTS.map((r) => r.city).sort()).toEqual(['Erfurt', 'Hannover', 'Leipzig', 'Potsdam', 'Stuttgart'])
    for (const report of CITY_REPORTS) {
      expect(report.url).toMatch(/^https:\/\//)
      expect(report.name).not.toBe('')
      expect(report.phone === null).toBe(report.phoneNote === null)
    }
  })

  it('finds the city of a Place by its location', () => {
    // A table tennis table in the Clara-Zetkin-Park, Leipzig.
    expect(findCityReport(51.3326, 12.3567)?.city).toBe('Leipzig')
    // Stuttgart-Bad Cannstatt.
    expect(findCityReport(48.8045, 9.2157)?.city).toBe('Stuttgart')
    // Potsdam-Babelsberg, not Berlin.
    expect(findCityReport(52.3916, 13.1003)?.city).toBe('Potsdam')
  })

  it('has no target far from the five cities', () => {
    // Dresden.
    expect(findCityReport(51.0504, 13.7373)).toBeNull()
  })

  it('makes a text to copy with the address, the coordinates and a map link', () => {
    const text = placeText('Tischtennis', 51.33261, 12.35673, 'Karl-Tauchnitz-Straße, Leipzig')

    expect(text.split('\n')).toEqual([
      'Tischtennis',
      'Karl-Tauchnitz-Straße, Leipzig',
      '51.33261, 12.35673',
      'https://www.openstreetmap.org/?mlat=51.33261&mlon=12.35673#map=19/51.33261/12.35673',
    ])
    expect(placeText('Basketball', 1, 2, null).split('\n')).toHaveLength(3)
  })
})
