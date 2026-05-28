'use client'

import { createContext, useContext, useEffect, useState } from 'react'

/**
 * Thème custom — sans next-themes.
 *
 * Stratégie zéro-flash :
 *  • CSS : :root = dark (défaut), .light = mode clair
 *  • layout.tsx <head> script : lit localStorage et pose .light si besoin
 *    → premier pixel déjà dans le bon thème, sans aucune attente JS
 *  • Ce provider lit l'état réel du DOM pour initialiser React
 *    → pas de remove→add, pas de flash
 *  • Toggle : ajoute/retire .light uniquement → aucun état intermédiaire
 */

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialisation depuis le DOM — déjà correct grâce au script <head>
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    // Lit l'état réel du DOM (posé par le script bloquant de layout.tsx)
    const current = document.documentElement.classList.contains('light') ? 'light' : 'dark'
    setThemeState(current)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    try { localStorage.setItem('theme', t) } catch {}
    if (t === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
