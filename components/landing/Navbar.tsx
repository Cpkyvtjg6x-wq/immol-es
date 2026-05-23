'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/*
  Logo — cercle + courbe exponentielle
  Deux paths, aucun fill, stroke pur.
  La courbe part plate (bas-gauche) et monte fortement (haut-droite)
  comme une courbe de rendement exponentielle.
*/
function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8.5" stroke="white" strokeWidth="1.35"/>
      <path
        d="M 3.8 15 C 9.5 15 15 8.5 15 4"
        stroke="white" strokeWidth="1.35" strokeLinecap="round" fill="none"
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
        className={`relative max-w-7xl mx-auto px-6 lg:px-10 flex items-center transition-all duration-500 ${
          scrolled ? 'h-[60px]' : 'h-[80px]'
        }`}
      >

        {/* LEFT — logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0 z-10">
          <div className="transition-opacity duration-200 group-hover:opacity-60">
            <Logo />
          </div>
          <span
            className="select-none text-white"
            style={{ fontSize: '15px', fontWeight: 500, letterSpacing: '-0.025em' }}
          >
            Immora
          </span>
        </Link>

        {/* CENTER — nav links (position absolue pour vrai centrage) */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-0.5">
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

        {/* RIGHT — separator + actions */}
        <div className="flex items-center gap-2 ml-auto z-10">
          {/* Separateur vertical — style Linear */}
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
