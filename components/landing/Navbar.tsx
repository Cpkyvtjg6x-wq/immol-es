'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

/*
  Logo — cercle + axe X + courbe exponentielle verte
  Les deux extremites de la courbe sont sur la paroi du cercle :
    depart : (4, 18)  = intersection cercle + axe X  -> cache par axe X ET cercle
    arrivee: (19, 5)  = point sur le cercle (sqrt((19-12)^2+(5-12)^2) ~ 9.9) -> cache par cercle
  La courbe part plate (masquee sous le trait) puis monte fort — vrai profil exponentiel.
  clipPath r=9.3 = bord interieur du trait du cercle (r10, sw1.4) -> jonction invisible.
*/
function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <clipPath id="lc">
          <circle cx="12" cy="12" r="9.1"/>
        </clipPath>
      </defs>

      <g clipPath="url(#lc)">
        {/* Courbe expo : part de (4,18) sur le cercle, flat puis abrupte, finit sur (19,5) */}
        <path
          d="M 4 18 C 11 18 15 8 19 5"
          stroke="#4ade80" strokeWidth="1.55" strokeLinecap="butt" fill="none"
        />
        {/* Axe X par dessus — cache le depart de la courbe */}
        <line x1="2" y1="18" x2="22" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="butt"/>
      </g>

      {/* Cercle en dernier — cache les deux extremites */}
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.8" opacity="0.9"/>
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
        <Link href="/" className="flex items-center gap-3 group flex-shrink-0 mr-8">
          <div className="transition-opacity duration-200 group-hover:opacity-70">
            <Logo />
          </div>
          <span
            className="select-none text-white"
            style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.035em' }}
          >
            Immora
          </span>
        </Link>

        {/* NAV LINKS — alignes a gauche apres le logo */}
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
          <div className="hidden md:block w-px h-4 bg-white/[0.12] mx-1" />

          {/* Link prefetch automatique au survol — évite le délai de téléchargement du bundle */}
          <Link
            href="/auth/login"
            className="text-[13.5px] text-zinc-500 hover:text-zinc-200 transition-colors duration-200 px-3 py-1.5 rounded-md"
          >
            Se connecter
          </Link>

          <Link
            href="/dashboard"
            className="group flex items-center gap-1.5 text-[13.5px] font-medium text-[#09090b] bg-white px-4 py-[7px] rounded-lg hover:bg-zinc-100 hover:-translate-y-px hover:shadow-[0_4px_20px_-4px_rgba(255,255,255,0.18)] transition-all duration-200"
          >
            Commencer
            <svg
              className="w-3 h-3 transition-transform group-hover:translate-x-0.5 opacity-60"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

      </div>
    </nav>
  )
}
