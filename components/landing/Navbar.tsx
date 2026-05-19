'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/* Logo mark — ascending bars (analytics × real estate) */
function ImmoraLogo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="relative flex-shrink-0 flex items-center justify-center rounded-xl overflow-hidden"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #0d0d0f 0%, #111114 100%)',
        boxShadow: '0 0 0 1px rgba(16,185,129,0.25), 0 0 20px -4px rgba(16,185,129,0.35)',
      }}
    >
      {/* Inner glow */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 70%)' }}
      />
      {/* Ascending bars */}
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 16 16"
        fill="none"
        className="relative z-10"
      >
        <rect x="1"   y="9"  width="3" height="6" rx="0.8" fill="#10b981" opacity="0.45" />
        <rect x="5.5" y="5"  width="3" height="10" rx="0.8" fill="#10b981" opacity="0.75" />
        <rect x="10"  y="1"  width="3" height="14" rx="0.8" fill="#10b981" />
        {/* Top glow dot on tallest bar */}
        <circle cx="11.5" cy="2" r="1" fill="#6ee7b7" opacity="0.9" />
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
            className="font-bold text-[15px] tracking-[-0.03em] text-white select-none"
            style={{ letterSpacing: '-0.025em' }}
          >
            IMMO<span className="text-emerald-400">RA</span>
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { label: 'Produit',        href: '#produit'   },
            { label: 'Fonctionnalités', href: '#features'  },
            { label: 'Tarifs',          href: '#pricing'   },
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
            className="group relative text-[13.5px] font-semibold text-zinc-950 px-4 py-1.5 rounded-md transition-all duration-200 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #34d399 0%, #10b981 60%, #059669 100%)',
              boxShadow: '0 0 16px -4px rgba(16,185,129,0.5)',
            }}
          >
            <span className="relative flex items-center gap-1.5">
              Commencer
              <svg
                className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </nav>
  )
}
