'use client'

import { ThemeProvider as NextThemeProvider } from 'next-themes'

/**
 * Stratégie anti-FOUC définitive (Safari + Chrome).
 *
 * value={{ dark: '', light: 'light' }}
 *   → dark  : aucune classe sur <html>. Le :root CSS = dark par défaut.
 *              next-themes ne touche rien → zéro flash même avant hydration.
 *   → light : classe .light ajoutée sur <html>. Les variables .light{ }
 *              surchargent :root avec les tokens mode clair.
 *
 * defaultTheme="dark" → si aucune préférence dans localStorage, dark.
 * enableSystem=false  → ignore prefers-color-scheme (design dark-first).
 * disableTransitionOnChange → empêche l'animation CSS lors du toggle manuel.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      themes={['dark', 'light']}
      value={{ dark: '', light: 'light' }}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  )
}
