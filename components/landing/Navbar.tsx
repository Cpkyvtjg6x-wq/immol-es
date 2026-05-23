'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/*
  Logo — cercle + axes X/Y + courbe exponentielle verte
  Axes en blanc subtil, courbe en vert emeraude #4ade80
*/
function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      {/* Cercle */}
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.2" opacity="0.9"/>
      {/* Axe X */}
      <line x1="4" y1="17" x2="20" y2="17" stroke="white" strokeWidth="0.9" opacity="0.35" strokeLinecap="round"/>
      {/* Axe Y */}
      <line x1="5" y1="4" x2="5" y2="19" stroke="white" strokeWidth="0.9" opacity="0.35" strokeLinecap="round"/>
      {/* Fleche axe X */}
      <path d="M18.5 15.8 L20 17 L18.5 18.2" stroke="white" strokeWidth="0.8" opacity="0.35" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Fleche axe Y */}
      <path d="M3.8 5.5 L5 4 L6.2 5.5" stroke="white" strokeWidth="0.8" opacity="0.35" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Courbe exponentielle verte */}
      <path
        d="M 5.5 17 C 9 17 13 13 19 5.5"
        stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" fill="none"
      />
    </svg>
  )
}

const NAV_LINKS = [
  { label: 'Produit',     href: '#produit'       },
  { label: 'Tarifs',      href: '#pricing'        },
  { label: 'Methode',     href: '/methodologie'   },
  { label: 'Contact',     href: 'mailto:hello@immora.app' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#09090b]/88 backdrop-blur-2xl border-b border-white/[0.07]'
          : 'bg-transparent'
      }`}
    >
      <div
        className={`max-w-7xl mx-auto px-6 lg:px-10 flex items-center transition-all duration-500 ${
          scrolled ? 'h-[60px]' : 'h-[76px]'
        }`}
      >

        {/* LEFT — logo + wordmark */}
        <Link href="/" className="flex items-center gap-3 group flex-shrink-0 mr-6">
          <div className="transition-opacity duration-200 group-hover:opacity-70">
            <Logo />
          </div>
          <span
            className="select-none text-white"
            style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.03em' }}
          >
            Immora
          </span>
        </Link>

        {/* NAV LINKS — alignes a gauche, apres le logo */}
        <div className="hidden md:flex items-center gap-0.5 flex-1">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[13.5px] text-zinc-500 hover:text-zinc-100 transition-colors duration-200 px-3.5 py-2 rounded-md hover:bg-white/[0.04]"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* RIGHT — separateur + actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Separateur vertical */}
          <div className="hidden md:block w-px h-4 bg-white/[0.12] mx-1" />

          <button
            onClick={() => router.push('/auth/login')}
            className="text-[13.5px] text-zinc-500 hover:text-zinc-200 transition-colors duration-200 px-3 py-1.5 rounded-md"
          >
            Se connecter
          </button>

          <button
            onClick={() => router.push('/analyse')}
            className="group flex items-center gap-1.5 text-[13.5px] font-medium text-[#09090b] bg-white px-4 py-[7px] rounded-lg hover:bg-zinc-100 hover:-translate-y-px hover:shadow-[0_4px_20px_-4px_rgba(255,255,255,0.18)] transition-all duration-200"
          >
            Commencer
            <svg
              className="w-3 h-3 transition-transform group-hover:translate-x-0.5 opacity-60"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>

      </div>
    </nav>
  )
}
