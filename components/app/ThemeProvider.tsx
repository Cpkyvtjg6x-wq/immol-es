'use client'

import { ThemeProvider as NextThemeProvider } from 'next-themes'

/**
 * Wrapper autour de next-themes.
 * attribute="class" → injecte la classe `dark` sur <html>.
 * defaultTheme="dark" → mode sombre par défaut (design existant).
 * enableSystem → respecte la préférence OS si l'utilisateur n'a pas
 *   encore fait de choix explicite.
 * disableTransitionOnChange → évite le flash blanc au changement de thème.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  )
}
