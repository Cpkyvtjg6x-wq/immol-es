'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
      <div className={`max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between transition-all duration-500 ${scrolled ? 'h-14' : 'h-[72px]'}`}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_24px_-4px_rgba(16,185,129,0.5)] transition-transform group-hover:scale-105">
            <svg className="w-3.5 h-3.5 text-zinc-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" />
            </svg>
          </div>
          <span className="text-white font-semibold text-[15px] tracking-tight">Immolyse</span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { label: 'Produit', href: '#produit' },
            { label: 'Fonctionnalités', href: '#features' },
            { label: 'Tarifs', href: '#pricing' },
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
            className="group relative text-[13.5px] font-medium text-zinc-950 bg-white hover:bg-zinc-100 px-3.5 py-1.5 rounded-md transition-all duration-200 hover:shadow-[0_0_24px_-4px_rgba(255,255,255,0.4)]"
          >
            <span className="flex items-center gap-1.5">
              Commencer
              <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </nav>
  )
}
