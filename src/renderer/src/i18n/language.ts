export type SupportedLanguage = 'en' | 'zh'

export function parseStoredLanguage(stored: string | null): SupportedLanguage | null {
  if (!stored) return null

  try {
    const value: unknown = JSON.parse(stored)
    return value === 'en' || value === 'zh' ? value : null
  } catch {
    return null
  }
}
