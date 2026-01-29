import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import LanguageSwitcher from './LanguageSwitcher.tsx'

interface NavLink {
  label: string
  href: string
}

interface HeaderProps {
  blogName: string
  logo?: string
  navigation?: NavLink[]
  basePath?: string
  currentLang?: string
  languages?: string[]
  translations?: Record<string, string>
}

/** Clean header — non-sticky, minimal with bottom border */
export default function Header({
  blogName,
  logo,
  navigation = [],
  basePath = '/',
  currentLang,
  languages,
  translations,
}: HeaderProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    const win = window as Window & { __toggleTheme?: () => void }
    win.__toggleTheme?.()
    setIsDark((prev) => !prev)
  }

  const homeHref = basePath === '/' ? '/' : basePath
  const showLangSwitcher = currentLang && languages && languages.length > 1

  return (
    <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <a
          href={homeHref}
          className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors"
        >
          {logo && (
            <img
              src={logo}
              alt={blogName}
              className="size-6 rounded-full object-cover"
            />
          )}
          <span className="font-medium">{blogName}</span>
        </a>

        <nav className="flex items-center gap-4">
          {navigation.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}

          {showLangSwitcher && (
            <LanguageSwitcher
              currentLang={currentLang}
              languages={languages}
              translations={translations ?? {}}
            />
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </nav>
      </div>
    </header>
  )
}
