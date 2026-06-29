'use client'

import { createContext, useContext, useEffect, useState } from 'react'

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

  useEffect(() => {
    const current = document.documentElement.classList.contains('light') ? 'light' : 'dark'
    setThemeState(current)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    try { localStorage.setItem('theme', t) } catch {}
    if (t === 'light') document.documentElement.classList.add('light')
    else document.documentElement.classList.remove('light')
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
