import { describe, expect, it } from 'vitest'
import { ADVISORY_LEVELS, advisoryDotClass, advisoryLevelClass, isAdvisoryLevel } from './advisory'
import nl from '@/i18n/locales/nl/countryInfo'
import en from '@/i18n/locales/en/countryInfo'

describe('advisory levels', () => {
  it('has a colour, a dark variant and a label in both languages for every level', () => {
    for (const level of ADVISORY_LEVELS) {
      expect(isAdvisoryLevel(level)).toBe(true)
      expect(advisoryLevelClass(level)).toMatch(/dark:bg-/)
      expect(advisoryDotClass(level)).not.toBe('')
      expect(nl.advisoryLevels[level]).toBeTruthy()
      expect(en.advisoryLevels[level]).toBeTruthy()
    }
  })

  it('ignores unknown levels', () => {
    expect(isAdvisoryLevel('somethingNew')).toBe(false)
    expect(isAdvisoryLevel(null)).toBe(false)
    expect(advisoryLevelClass('somethingNew')).toBe('')
  })
})
