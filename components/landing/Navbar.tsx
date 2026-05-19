'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/* Logo IMMORA — maison minimaliste, même style que le calculateur HTML */
function ImmoraLogo({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.29) + 'px',
        background: 'linear-gradient(145deg, #1a2e1a 0%, #0f1f10 60%, #0a1a0a 100%)',
        boxShadow: '0 0 0 1px rgba(74,222,128,0.22), 0 0 20px rgba(74,222,128,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Reflet interne haut-gauche */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(74,222,128,0.07) 0%, transparent 55%)',
        pointerEvents: 'none',
      }} />

      <svg
        width={size * 0.72}
        height={size * 0.72}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Ombre portée maison */}
        <path d="M10 2L1 8.5H3V18H8.8V13H11.2V18H17V8.5H19L10 2Z"
          fill="#000000" opacity="0.3" transform="translate(0.4, 0.4)" />

        {/* Corps maison — blanc légèrement transparent */}
        <path d="M10 2.5L2 8.6H3.7V17.5H8.8V12.5H11.2V17.5H16.3V8.6H18L10 2.5Z"
          fill="white" opacity="0.92" />

        {/* Ligne de faîtage — accent subtil */}
        <path d="M10 2.5L18 8.6"
          stroke="white" strokeWidth="0.5" strokeLinecap="round" opacity="0.4" />

        {/* Porte minimaliste */}
        <rect x="8.8" y="12.7" width="2.4" height="4.8" rx="1"
          fill="#0a1a0a" opacity="0.55" />

        {/* Point vert accent — coin haut droit */}
        <circle cx="16.5" cy="3.8" r="2.2" fill="#4ADE80" />
        <circle cx="16.5" cy="3.8" r="1.1" fill="#000000" opacity="0.35" />
      </svg>
    </div>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#09090b]/70 backdrop-blur-2xl border-b border-white/[0.05]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div
        className={`max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between transition-all duration-500 ${
          scrolled ? 'h-14' : 'h-[72px]'
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="transition-transform duration-300 group-hover:scale-105">
            <ImmoraLogo size={28} />
          </div>
          <span
            className="select-none text-white"
            style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.04em' }}
          >
            IMMO<span style={{ color: '#4ade80' }}>RA</span>
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { label: 'Produit',         href: '#produit'  },
            { label: 'Fonctionnalités', href: '#features' },
            { label: 'Tarifs',          href: '#pricing'  },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[13.5px] text-zinc-400 hover:text-white transition-colors duration-200 px-3 py-1.5 rounded-md"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => router.push('/auth/login')}
            className="text-[13.5px] text-zinc-400 hover:text-white transition-colors duration-200 px-3 py-1.5 rounded-md"
          >
            Se connecter
          </button>
          <button
            onClick={() => router.push('/analyse')}
            className="group text-[13.5px] font-semibold text-zinc-950 px-4 py-1.5 rounded-md transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 55%, #16a34a 100%)',
              boxShadow: '0 0 16px -4px rgba(74,222,128,0.45)',
            }}
          >
            <span className="flex items-center gap-1.5">
              Commencer
              <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </nav>
  )
}
