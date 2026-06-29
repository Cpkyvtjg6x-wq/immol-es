'use client'

import { createContext, useContext, useEffect } from 'react'

/**
 * Thème custom — sans next-themes.
 *
 * ⚠️ v1 DARK-ONLY : le mode clair est temporairement désactivé. Les primitives UI
 * (Input/Select/Card/Button/Toast/Tooltip) et QuickAnalyse sont encore câblées en
 * dark en dur → en mode clair le rendu est cassé. On force donc le thème sombre et
 * on neutralise tout `.light` résiduel (utilisateur qui avait activé le clair avant).
 * Réactiver le toggle une fois la refonte tokens faite (cf. plan Phase 2).
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
  // v1 dark-only : on neutralise tout `.light` posé par une session précédente.
  useEffect(() => {
    document.documentElement.classList.remove('light')
    try { localStorage.removeItem('theme') } catch {}
  }, [])

  // No-op tant que le mode clair n'est pas refait : toute tentative de bascule
  // retombe sur le dark (et retire un éventuel `.light`).
  const setTheme = (_t: Theme) => {
    document.documentElement.classList.remove('light')
  }

  return (
    <ThemeContext.Provider value={{ theme: 'dark', resolvedTheme: 'dark', setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
