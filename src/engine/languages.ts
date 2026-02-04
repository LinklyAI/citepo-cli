/**
 * Centralized language configuration for CitePo.
 * Used by CLI, themes, and engine.
 */

/** Supported language codes */
export const LANGUAGE_CODES = ['en', 'zh', 'es', 'pt', 'fr', 'de', 'ja', 'ko', 'ru', 'ar'] as const

export type LanguageCode = (typeof LANGUAGE_CODES)[number]

/** Language display names in their native form */
export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: 'English',
  zh: '中文',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  ko: '한국어',
  ru: 'Русский',
  ar: 'العربية',
}

/** English descriptions for CLI hints */
export const LANGUAGE_HINTS: Record<LanguageCode, string> = {
  en: '',
  zh: 'Chinese',
  es: 'Spanish',
  pt: 'Portuguese',
  fr: 'French',
  de: 'German',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  ar: 'Arabic',
}

/**
 * Get display label for a language code.
 * Falls back to uppercase code if not found.
 */
export function getLanguageLabel(code: string): string {
  return LANGUAGE_LABELS[code as LanguageCode] ?? code.toUpperCase()
}
