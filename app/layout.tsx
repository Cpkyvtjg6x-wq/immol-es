import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Instrument_Serif } from 'next/font/google'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/components/app/ThemeProvider'
import { UpgradeProvider } from '@/lib/upgrade-context'
import './globals.css'

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'IMMORA — Calculateur d\'investissement immobilier',
    template: '%s | IMMORA',
  },
  description:
    'Analysez vos investissements immobiliers avec précision : rendement, cash-flow, fiscalité (LMNP, SCI, Réel), score IA et données de marché pour toutes les villes françaises.',
  keywords: [
    'investissement immobilier',
    'calculateur rendement',
    'LMNP',
    'SCI',
    'cash-flow',
    'rendement locatif',
    'fiscalité immobilier',
  ],
  authors: [{ name: 'IMMORA' }],
  creator: 'IMMORA',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'IMMORA',
    title: 'IMMORA — Calculateur d\'investissement immobilier',
    description:
      'Analysez vos investissements immobiliers : rendement, cash-flow, fiscalité et score IA.',
    // og:image fourni automatiquement par app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IMMORA — Calculateur d\'investissement immobilier',
    description: 'Analysez vos investissements immobiliers avec précision.',
    // twitter:image fourni automatiquement par app/opengraph-image.tsx
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1 },
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /*
     * Anti-FOUC : globals.css définit :root = dark (tokens sombres par défaut).
     * Sans classe sur <html>, le navigateur charge déjà le dark mode via :root.
     * next-themes ajoute "dark" (aucune règle CSS → :root dark reste) ou
     * "light" (règle .light active → tokens clairs). Zéro flash possible.
     * suppressHydrationWarning : next-themes modifie la classe côté client.
     */
    <html
      lang="fr"
      translate="no"
      className={`${GeistSans.variable} ${instrumentSerif.variable} notranslate`}
      suppressHydrationWarning
    >
      {/*
       * Script anti-FOUC — s'exécute de façon SYNCHRONE avant tout rendu.
       * Placé dans <head> côté serveur → présent dans le HTML initial,
       * bloque le navigateur le temps de lire localStorage et d'appliquer
       * la classe. Même principe que Vercel, Linear, Notion, etc.
       * Notre CSS : :root = dark (défaut), .light = mode clair.
       * → Pour dark : rien à faire (:root suffit).
       * → Pour light : ajouter .light avant le premier pixel rendu.
       */}
      <head>
        {/* Anti-crash Google Traduction : l'app est en français et son DOM est très
            dynamique (calculateur). Si Chrome/Google Translate traduit la page, il
            remplace les nœuds texte et fait planter React (removeChild/insertBefore)
            → "Application error: a client-side exception". On désactive la traduction. */}
        <meta name="google" content="notranslate" />
        {/* Filet de sécurité React × traduction : si un outil externe (Google
            Translate, extension) déplace des nœuds texte malgré notranslate, on
            empêche removeChild/insertBefore de jeter (sinon crash client). */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){if(typeof Node!=='function'||!Node.prototype)return;var rc=Node.prototype.removeChild;Node.prototype.removeChild=function(c){if(c&&c.parentNode!==this){return c}return rc.apply(this,arguments)};var ib=Node.prototype.insertBefore;Node.prototype.insertBefore=function(n,r){if(r&&r.parentNode!==this){return n}return ib.apply(this,arguments)}})()` }} />
        {/* Anti-FOUC : applique .light avant le premier pixel si le user l'a choisi. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}})()` }} />
      </head>
      <body className="antialiased min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <UpgradeProvider>
                {children}
              </UpgradeProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
