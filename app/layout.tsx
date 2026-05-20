import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { ToastProvider } from '@/components/ui/Toast'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
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
    <html
      lang="fr"
      className={`${inter.variable} ${spaceGrotesk.variable} dark`}
      suppressHydrationWarning
    >
      <body className="bg-zinc-950 text-zinc-50 antialiased min-h-screen">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
