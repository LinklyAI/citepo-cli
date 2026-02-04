'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { getLanguageLabel } from '../../../engine/languages'

interface LanguageSwitcherProps {
  currentLang: string
  languages: string[]
  translations: Record<string, string>
}

/** Inline language switcher — current language highlighted, others as links */
export default function LanguageSwitcher({
  currentLang,
  languages,
  translations,
}: LanguageSwitcherProps) {
  if (languages.length <= 1) return null

  const currentLabel = getLanguageLabel(currentLang)

  return (
    <div className="flex items-center gap-1 text-sm">
      <Select
        value={currentLang}
        onValueChange={(lang) => {
          if (lang === currentLang) return
          const url = translations[lang]
          if (!url) return
          if (typeof window !== 'undefined') {
            window.location.href = url
          }
        }}
      >
        <SelectTrigger size="sm" className="min-w-[4em] select-none">
          <SelectValue>{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          {languages.map((lang) => {
            const label = getLanguageLabel(lang)
            const url = translations[lang]
            const isCurrent = lang === currentLang
            const isDisabled = !url && !isCurrent

            return (
              <SelectItem key={lang} value={lang} disabled={isDisabled}>
                {label}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
