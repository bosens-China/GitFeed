import { describe, expect, it } from 'vitest'
import { parseStoredLanguage } from '../src/renderer/src/i18n/language'

describe('parseStoredLanguage', () => {
  it('restores explicit supported languages', () => {
    expect(parseStoredLanguage('"en"')).toBe('en')
    expect(parseStoredLanguage('"zh"')).toBe('zh')
  })

  it('uses the system language for the serialized system preference', () => {
    expect(parseStoredLanguage('"system"')).toBeNull()
  })

  it('ignores malformed or unsupported values', () => {
    expect(parseStoredLanguage(null)).toBeNull()
    expect(parseStoredLanguage('not-json')).toBeNull()
    expect(parseStoredLanguage('"fr"')).toBeNull()
  })
})
