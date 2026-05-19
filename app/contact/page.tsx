'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/landing/Navbar'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '', plan: 'agency' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Simple mailto fallback — à remplacer par une API d'email (Resend, Postmark…)
    await new Promise(r => setTimeout(r, 800))
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 pt-28 pb-20">
        <div className="grid md:grid-cols-[1fr_1.4fr] gap-16 items-start">

          {/* Gauche — infos */}
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-4">
                <div className="w-4 h-px bg-emerald-500" /> Plan Agence
              </div>
              <h1 className="text-4xl font-black text-white leading-tight mb-4">
                Parlons de votre projet
              </h1>
              <p className="text-zinc-400 leading-relaxed">
                IMMORA Agence est conçu pour les professionnels de l'immobilier, les conseillers en gestion de patrimoine et les agences qui accompagnent leurs clients dans leurs investissements.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { title: 'Jusqu\'à 5 utilisateurs', desc: 'Partagez l\'accès avec toute votre équipe', icon: '👥' },
                { title: 'Rapports à votre image', desc: 'Logo, couleurs et nom de votre société sur chaque PDF', icon: '🎨' },
                { title: 'API access', desc: 'Intégrez IMMORA à vos outils existants', icon: '🔌' },
                { title: 'Onboarding dédié', desc: 'Un expert vous accompagne lors du démarrage', icon: '🚀' },
              ].map(f => (
                <div key={f.title} className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-lg shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{f.title}</div>
                    <div className="text-xs text-zinc-500">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Tarif Agence</div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-black text-white">79€</span>
                <span className="text-zinc-500 text-sm mb-0.5">/mois</span>
              </div>
              <div className="text-xs text-emerald-500 font-medium">ou 59€/mois facturé annuellement</div>
            </div>
          </div>

          {/* Droite — formulaire */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
            {sent ? (
              <div className="text-center space-y-4 py-8">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-3xl">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-white">Message envoyé !</h3>
                <p className="text-zinc-400 text-sm">
                  Notre équipe vous contactera sous 24h pour organiser une démonstration.
                </p>
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium mt-2">
                  ← Retour à l'accueil
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-lg font-bold text-white mb-6">Demande de démo</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nom complet *</label>
                    <input
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Jean Dupont" required
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email professionnel *</label>
                    <input
                      type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="vous@agence.fr" required
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Société / Cabinet</label>
                  <input
                    value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    placeholder="Votre agence immobilière"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Votre besoin</label>
                  <textarea
                    value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Décrivez votre utilisation prévue, le nombre d'utilisateurs, vos outils actuels…"
                    rows={4}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Envoi…</>
                  ) : 'Demander une démonstration →'}
                </button>

                <p className="text-xs text-zinc-600 text-center">
                  Réponse sous 24h · Sans engagement
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
