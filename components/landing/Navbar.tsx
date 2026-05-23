'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/* Logo Immora — 2 strokes, no fill, Linear/Stripe style */
function Logo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      {/* Toit */}
      <path
        d="M1 10L9 2L17 10"
        stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Corps + porte */}
      <path
        d="M3.5 9.2V16.5H7V12H11V16.5H14.5V9.2"
        stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

const NAV_LINKS = [
  { label: 'Produit',  href: '#produit'  },
  { label: 'Tarifs',   href: '#pricing'  },
  { label: 'Methode',  href: '/methodologie' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 32)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#09090b]/85 backdrop-blur-2xl border-b border-white/[0.06]'
          : 'bg-transparent'
      }`}
    >
      <div
        className={`max-w-7xl mx-auto px-6 lg:px-10 flex items-center transition-all duration-500 ${
          scrolled ? 'h-14' : 'h-[68px]'
        }`}
      >
        {/* LEFT — logo + nav */}
        <div className="flex items-center gap-7 flex-1">

          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="transition-opacity duration-200 group-hover:opacity-70">
              <Logo />
            </div>
            <span
              className="select-none text-white"
              style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.03em' }}
            >
              Immora
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-[13.5px] text-zinc-500 hover:text-zinc-200 transition-colors duration-200 px-3 py-1.5 rounded-md hover:bg-white/[0.04]"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        {/* RIGHT — actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => router.push('/auth/login')}
            className="text-[13.5px] text-zinc-500 hover:text-zinc-200 transition-colors duration-200 px-3 py-1.5 rounded-md"
          >
            Se connecter
          </button>

          <button
            onClick={() => router.push('/analyse')}
            className="group flex items-center gap-1.5 text-[13.5px] font-semibold text-[#09090b] bg-white px-4 py-1.5 rounded-lg hover:bg-zinc-100 hover:-translate-y-px hover:shadow-[0_4px_20px_-4px_rgba(255,255,255,0.2)] transition-all duration-200"
          >
            Commencer
            <svg
              className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
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
