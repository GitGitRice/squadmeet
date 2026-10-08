import { describe, expect, it } from 'vitest'
import { placeIdFromPath, placePath } from './route'

describe('Place detail URL', () => {
  it('is /platz/<id>', () => {
    expect(placePath(42)).toBe('/platz/42')
  })

  it('reads the id back from the path', () => {
    expect(placeIdFromPath('/platz/42')).toBe(42)
    expect(placeIdFromPath('/platz/42/')).toBe(42)
  })

  it('is not a detail page for other paths', () => {
    expect(placeIdFromPath('/')).toBeNull()
    expect(placeIdFromPath('/platz/')).toBeNull()
    expect(placeIdFromPath('/platz/abc')).toBeNull()
    expect(placeIdFromPath('/platz/42/x')).toBeNull()
  })
})
