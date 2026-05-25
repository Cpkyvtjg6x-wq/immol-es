import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Instrument_Serif } from 'next/font/google'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/components/app/ThemeProvider'
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
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'IMMORA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IMMORA — Calculateur d\'investissement immobilier',
    description: 'Analysez vos investissements immobiliers avec précision.',
    images: [`${process.env.NEXT_PUBLIC_APP_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1 },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /*
     * suppressHydrationWarning : next-themes injecte la classe `dark` ou
     * rien côté client, ce qui provoquerait un mismatch sans ce flag.
     * next-themes gère lui-même la classe — plus besoin du `dark` hardcodé.
     */
    <html
      lang="fr"
      className={`${GeistSans.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
