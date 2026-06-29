'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

/**
 * Thème custom — sans next-themes.
 * :root = dark (défaut), .light = mode clair. Le script <head> de layout.tsx pose
 * .light avant le 1er pixel (anti-FOUC) ; ce provider lit l'état réel du DOM.
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
  const [theme, setThemeState] = useState<Theme>('dark')
  const transitionTimer = useRef<number | null>(null)

  useEffect(() => {
    const current = document.documentElement.classList.contains('light') ? 'light' : 'dark'
    setThemeState(current)
    return () => {
      if (transitionTimer.current) window.clearTimeout(transitionTimer.current)
    }
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    try { localStorage.setItem('theme', t) } catch {}

    const root = document.documentElement

    // Transition douce des couleurs le temps du switch (sauf si l'utilisateur
    // préfère réduire les animations). La classe .theme-transition active une
    // transition globale (globals.css), retirée après l'animation pour ne pas
    // la laisser en continu (perf + pas de flash à l'hydratation).
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (!reduceMotion) {
      root.classList.add('theme-transition')
      if (transitionTimer.current) window.clearTimeout(transitionTimer.current)
      transitionTimer.current = window.setTimeout(() => {
        root.classList.remove('theme-transition')
        transitionTimer.current = null
      }, 500)
    }

    if (t === 'light') root.classList.add('light')
    else root.classList.remove('light')
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
