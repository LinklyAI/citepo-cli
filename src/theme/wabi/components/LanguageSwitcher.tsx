interface LanguageSwitcherProps {
  currentLang: string
  languages: string[]
  translations: Record<string, string>
}

/** Language display names */
const LANG_LABELS: Record<string, string> = {
  en: 'EN',
  zh: '中文',
  ja: '日本語',
}

/** Inline language switcher — current language highlighted, others as links */
export default function LanguageSwitcher({
  currentLang,
  languages,
  translations,
}: LanguageSwitcherProps) {
  if (languages.length <= 1) return null

  return (
    <div className="flex items-center gap-1 text-sm">
      {languages.map((lang, i) => {
        const label = LANG_LABELS[lang] ?? lang.toUpperCase()
        const isCurrent = lang === currentLang
        const url = translations[lang]

        return (
          <span key={lang} className="flex items-center">
            {i > 0 && <span className="text-border mx-1">/</span>}
            {isCurrent ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : url ? (
              <a
                href={url}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </a>
            ) : (
              <span className="text-muted-foreground/50 cursor-not-allowed">{label}</span>
            )}
          </span>
        )
      })}
    </div>
  )
}
