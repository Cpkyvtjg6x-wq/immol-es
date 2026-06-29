'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { mensualite as calcMensualitePret } from '@/lib/finance'
import { IconLeaf, IconTrendingUp, IconBuildingOffice, IconHome, IconRocket, IconChartBar, IconBuildingLibrary, IconBriefcase, IconArrowTrendingUp } from '@/components/ui/icons'

interface OnboardingWizardProps {
  userId: string
  onComplete: () => void
}

type Profile = 'debutant' | 'experimente' | 'professionnel'

const PROFILES: { id: Profile; title: string; desc: string; Icon: React.FC<{ className?: string }> }[] = [
  {
    id: 'debutant',
    title: 'Investisseur débutant',
    desc: "Je commence à m'intéresser à l'investissement locatif",
    Icon: IconLeaf,
  },
  {
    id: 'experimente',
    title: 'Investisseur expérimenté',
    desc: "J'ai déjà un ou plusieurs biens et je veux optimiser",
    Icon: IconTrendingUp,
  },
  {
    id: 'professionnel',
    title: 'Professionnel',
    desc: 'Agent immobilier, CGP ou conseiller patrimonial',
    Icon: IconBuildingOffice,
  },
]

const DEMO_BIEN = {
  name: 'Appartement T2 — Bordeaux',
  prixAchat: 185000,
  loyer: 850,
  charges: 150,
  apport: 37000,
  taux: 3.7,
  duree: 20,
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current ? 'w-6 h-1.5 bg-emerald-500' : i < current ? 'w-1.5 h-1.5 bg-emerald-500/40' : 'w-1.5 h-1.5 bg-th-surface3'
          }`}
        />
      ))}
    </div>
  )
}

export function OnboardingWizard({ userId, onComplete }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [closing, setClosing] = useState(false)

  // Calculs simplifiés pour le bien démo (formule partagée — cf. lib/finance)
  const mensualite = Math.round(
    calcMensualitePret(DEMO_BIEN.prixAchat - DEMO_BIEN.apport, DEMO_BIEN.taux, DEMO_BIEN.duree)
  )
  const cashflow = Math.round(DEMO_BIEN.loyer - DEMO_BIEN.charges - mensualite)
  const rendBrut = Math.round((DEMO_BIEN.loyer * 12 / DEMO_BIEN.prixAchat) * 1000) / 10

  async function markComplete() {
    try {
      const supabase = createBrowserSupabaseClient()
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true, investor_profile: profile })
        .eq('id', userId)
    } catch {
      // Silently fail — ne pas bloquer l'UX
    }
  }

  async function handleFinish() {
    setClosing(true)
    await markComplete()
    // Charger le bien démo dans le calculateur
    sessionStorage.setItem('immora_load_params', JSON.stringify({
      prixAchat: DEMO_BIEN.prixAchat,
      loyer: DEMO_BIEN.loyer,
      charges: DEMO_BIEN.charges,
      apport: DEMO_BIEN.apport,
      taux: DEMO_BIEN.taux,
      duree: DEMO_BIEN.duree,
      ville: 'Bordeaux',
      typeBien: 'appartement',
      surface: 42,
      etat: 'ancien',
    }))
    onComplete()
    router.push('/analyse')
  }

  async function handleSkip() {
    setClosing(true)
    await markComplete()
    onComplete()
  }

  if (closing) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-th-surface border border-th-border-med rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-th-border">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-sm font-bold text-th-text-1">IMMORA</span>
            </div>
            <button onClick={handleSkip} className="text-xs text-th-text-3 hover:text-th-text-2 transition-colors">
              Passer →
            </button>
          </div>
          <StepDots total={3} current={step} />
        </div>

        {/* ── Step 0 — Profil ── */}
        {step === 0 && (
          <div className="px-8 py-7 space-y-6">
            <div>
              <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-2">Étape 1 sur 3</p>
              <h2 className="text-xl font-black text-th-text-1" style={{ letterSpacing: '-0.03em' }}>
                Bienvenue sur IMMORA 👋
              </h2>
              <p className="text-sm text-th-text-2 mt-2">
                Quel est votre profil d&apos;investisseur ? Cela nous aide à personnaliser votre expérience.
              </p>
            </div>
            <div className="space-y-3">
              {PROFILES.map(p => (
                <button
                  key={p.id}
                  onClick={() => setProfile(p.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    profile === p.id
                      ? 'border-emerald-500/50 bg-emerald-500/[0.06]'
                      : 'border-th-border bg-th-surface hover:border-th-border-med hover:bg-th-surface2'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-th-surface2 border border-th-border flex items-center justify-center shrink-0">
                    <p.Icon className="w-5 h-5 text-th-text-2" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-th-text-1">{p.title}</p>
                    <p className="text-xs text-th-text-2 mt-0.5">{p.desc}</p>
                  </div>
                  {profile === p.id && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => profile && setStep(1)}
              disabled={!profile}
              className="w-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 disabled:opacity-40 font-bold py-3.5 rounded-xl text-sm transition-all"
            >
              Continuer →
            </button>
          </div>
        )}

        {/* ── Step 1 — Démo bien ── */}
        {step === 1 && (
          <div className="px-8 py-7 space-y-6">
            <div>
              <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-2">Étape 2 sur 3</p>
              <h2 className="text-xl font-black text-th-text-1" style={{ letterSpacing: '-0.03em' }}>
                Votre première simulation
              </h2>
              <p className="text-sm text-th-text-2 mt-2">
                Voici un exemple réaliste d&apos;investissement à Bordeaux. Voyez comment IMMORA l&apos;analyse en quelques secondes.
              </p>
            </div>

            {/* Bien démo */}
            <div className="rounded-xl border border-th-border-med bg-th-surface2 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <IconHome className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-th-text-1">{DEMO_BIEN.name}</p>
                  <p className="text-xs text-th-text-2">Bien exemple — modifiable à tout moment</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Prix achat', value: `${(DEMO_BIEN.prixAchat / 1000).toFixed(0)} 000 €` },
                  { label: 'Loyer mensuel', value: `${DEMO_BIEN.loyer} €/mois` },
                  { label: 'Apport', value: `${(DEMO_BIEN.apport / 1000).toFixed(0)} 000 €` },
                  { label: 'Durée prêt', value: `${DEMO_BIEN.duree} ans à ${DEMO_BIEN.taux}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-th-surface2 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-sm font-bold text-th-text-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Résultats flash */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-th-border bg-th-surface p-4 text-center">
                <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wide mb-2">Rendement brut</p>
                <p className="text-xl font-black text-emerald-400">{rendBrut}%</p>
              </div>
              <div className="rounded-xl border border-th-border bg-th-surface p-4 text-center">
                <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wide mb-2">Mensualité</p>
                <p className="text-xl font-black text-th-text-1">{mensualite} €</p>
              </div>
              <div className={`rounded-xl border p-4 text-center ${cashflow >= 0 ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : 'border-red-500/20 bg-red-500/[0.05]'}`}>
                <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wide mb-2">Cashflow</p>
                <p className={`text-xl font-black ${cashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {cashflow >= 0 ? '+' : ''}{cashflow} €
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="flex-1 bg-th-surface2 hover:bg-th-surface3 border border-th-border text-th-text-1 font-semibold py-3 rounded-xl text-sm transition-all"
              >
                ← Retour
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-2 flex-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 font-bold py-3 rounded-xl text-sm transition-all"
              >
                Voir l&apos;analyse complète →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 — C'est parti ── */}
        {step === 2 && (
          <div className="px-8 py-7 space-y-6 text-center">
            <div>
              <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-2">Étape 3 sur 3</p>
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <IconArrowTrendingUp className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-black text-th-text-1" style={{ letterSpacing: '-0.03em' }}>
                Vous êtes prêt !
              </h2>
              <p className="text-sm text-th-text-2 mt-2 leading-relaxed">
                Analysez votre premier bien réel dans le calculateur. Tous vos résultats sont sauvegardés automatiquement dans votre dashboard.
              </p>
            </div>

            <div className="space-y-3 text-left">
              {[
                { Icon: IconChartBar, text: 'Calculs instantanés : rendement, cashflow, TRI' },
                { Icon: IconBuildingLibrary, text: 'Dossier bancaire HCSF prêt pour votre banquier (Pro)' },
                { Icon: IconBriefcase, text: 'Simulations sauvegardées et comparables' },
                { Icon: IconArrowTrendingUp, text: 'Export PDF professionnel en 1 clic (Pro)' },
              ].map(({ Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-th-surface2 border border-th-border flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-th-text-2" />
                  </div>
                  <p className="text-sm text-th-text-1">{text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleFinish}
              className="w-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 font-bold py-4 rounded-xl text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              Sauvegarder et créer votre premier bien réel →
            </button>
            <button
              onClick={handleSkip}
              className="text-xs text-th-text-3 hover:text-th-text-2 transition-colors block w-full text-center"
            >
              Je préfère explorer seul
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
