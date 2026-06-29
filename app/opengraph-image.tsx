import { ImageResponse } from 'next/og'

// Image OG/Twitter générée à la volée (1200×630) — remplace l'ancien /og-image.png
// 404. Convention Next.js : ce fichier alimente automatiquement og:image et
// twitter:image pour toute l'app.

export const runtime = 'edge'
export const alt = "Immora — Calculateur d'investissement immobilier"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#0b0f0d',
          padding: '90px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '44px' }}>
          <div style={{ width: 14, height: 56, background: '#4ade80', borderRadius: 6, marginRight: 22 }} />
          <div style={{ fontSize: 46, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em' }}>
            Immora
          </div>
        </div>
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.08,
            letterSpacing: '-0.04em',
            maxWidth: 940,
          }}
        >
          Analysez vos investissements immobiliers
        </div>
        <div style={{ fontSize: 36, color: '#4ade80', marginTop: 30, fontWeight: 600 }}>
          Rendement · Cash-flow · Fiscalité · Score
        </div>
      </div>
    ),
    { ...size },
  )
}
