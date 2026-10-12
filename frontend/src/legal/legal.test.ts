import { describe, expect, it } from 'vitest'
import { legalPageFromPath, RESPONSIBLE } from './legal'

describe('legalPageFromPath', () => {
  it('knows the privacy page and the imprint, with or without a slash at the end', () => {
    expect(legalPageFromPath('/datenschutz')).toBe('privacy')
    expect(legalPageFromPath('/impressum/')).toBe('imprint')
  })

  it('is null for other paths', () => {
    expect(legalPageFromPath('/')).toBeNull()
    expect(legalPageFromPath('/platz/7')).toBeNull()
  })
})

describe('RESPONSIBLE', () => {
  it('has no placeholder left, so the imprint can go live', () => {
    for (const value of Object.values(RESPONSIBLE)) {
      expect(value).not.toMatch(/TODO/)
    }
  })
})
