'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Liste des features qui peuvent déclencher une demande d'upgrade.
 * Le label / la promesse affichée dépend de la feature.
 */
export type UpgradeFeature =
  | 'save_limit'      // l'utilisateur free a atteint son quota de simulations
  | 'ai_insights'     // accès à l'analyse IA
  | 'export_pdf'      // export PDF complet (sans watermark)
  | 'export_excel'    // export Excel
  | 'bank_report'     // dossier bancaire pro
  | 'comparaison'    // comparaison multi-biens
  | 'patrimoine'      // suivi des biens détenus
  | 'market_data'     // données marché complètes
  | 'white_label'     // logo personnalisé (Agence)
  | 'gestion_locative' // module de gestion locative complet
  | 'generic'         // CTA générique

interface UpgradeContextValue {
  prompt: (feature: UpgradeFeature) => void
  close: () => void
}

const UpgradeContext = createContext<UpgradeContextValue | null>(null)

const FEATURE_LABELS: Record<UpgradeFeature, { title: string; subtitle: string; recommendedPlan: 'pro' | 'agency' }> = {
  save_limit: {
    title: 'Vous avez atteint la limite de simulations gratuites',
    subtitle: "Passez Pro pour sauvegarder un nombre illimité de simulations et débloquer toutes les fonctionnalités avancées.",
    recommendedPlan: 'pro',
  },
  ai_insights: {
    title: "L'analyse IA est réservée au plan Pro",
    subtitle: "Obtenez une analyse personnalisée par GPT-4 sur la rentabilité, les risques et les opportunités d'optimisation de votre bien.",
    recommendedPlan: 'pro',
  },
  export_pdf: {
    title: "L'export PDF complet est réservé au plan Pro",
    subtitle: "Téléchargez vos analyses complètes en PDF professionnel, sans watermark, prêtes à imprimer ou à partager.",
    recommendedPlan: 'pro',
  },
  export_excel: {
    title: "L'export Excel est réservé au plan Pro",
    subtitle: "Téléchargez vos données sous forme de tableur pour vos analyses personnalisées.",
    recommendedPlan: 'pro',
  },
  bank_report: {
    title: 'Le dossier bancaire est réservé au plan Pro',
    subtitle: "Un dossier complet (capacité d'emprunt, ratios, stress-test, garanties) pour convaincre votre banquier.",
    recommendedPlan: 'pro',
  },
  comparaison: {
    title: 'La comparaison multi-biens est réservée au plan Pro',
    subtitle: "Comparez jusqu'à 5 simulations côte à côte pour identifier la meilleure opportunité.",
    recommendedPlan: 'pro',
  },
  patrimoine: {
    title: 'Le suivi de patrimoine est réservé au plan Pro',
    subtitle: "Marquez vos biens comme acquis, suivez leur évolution et gérez votre portefeuille immobilier.",
    recommendedPlan: 'pro',
  },
  market_data: {
    title: 'Les données marché complètes sont réservées au plan Pro',
    subtitle: "Accédez à toutes les données : prix au m², loyers, tension locative, démographie.",
    recommendedPlan: 'pro',
  },
  white_label: {
    title: 'Le rapport white-label est réservé au plan Agence',
    subtitle: "Personnalisez vos PDF avec votre logo et nom d'agence pour vos clients.",
    recommendedPlan: 'agency',
  },
  gestion_locative: {
    title: 'La gestion locative est réservée au plan Pro',
    subtitle: "Pilotez vos biens loués : loyers, quittances, baux, révision IRL, travaux, charges et préparation de la déclaration — tout au même endroit.",
    recommendedPlan: 'pro',
  },
  generic: {
    title: 'Cette fonctionnalité est réservée au plan Pro',
    subtitle: "Débloquez toutes les fonctionnalités avancées d'IMMORA pour seulement 12,90 €/mois.",
    recommendedPlan: 'pro',
  },
}

const PLAN_DETAILS: Record<'pro' | 'agency', { name: string; priceAnnual: number; priceMonthly: number; cta: string }> = {
  pro: { name: 'Pro', priceAnnual: 12.90, priceMonthly: 19.90, cta: 'Essai 14 jours gratuit' },
  agency: { name: 'Agence', priceAnnual: 39, priceMonthly: 59, cta: 'Essai 14 jours gratuit' },
}

export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const [feature, setFeature] = useState<UpgradeFeature | null>(null)
  const router = useRouter()

  const close = useCallback(() => setFeature(null), [])
  const prompt = useCallback((f: UpgradeFeature) => setFeature(f), [])

  const value = useMemo(() => ({ prompt, close }), [prompt, close])

  const info = feature ? FEATURE_LABELS[feature] : null
  const plan = info ? PLAN_DETAILS[info.recommendedPlan] : null

  const handleUpgrade = useCallback(() => {
    if (!info) return
    close()
    router.push(`/checkout/start?plan=${info.recommendedPlan}&cycle=annual`)
  }, [info, close, router])

  return (
    <UpgradeContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {feature && info && plan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={close}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative max-w-md w-full bg-th-surface border border-th-border rounded-2xl p-6 sm:p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* close */}
              <button
                onClick={close}
                aria-label="Fermer"
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-th-text-2 hover:text-th-text-1 hover:bg-th-surface2 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* icon */}
              <div className="mb-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>

              {/* title */}
              <h2 className="text-xl font-bold text-th-text-1 mb-2 leading-snug">{info.title}</h2>
              <p className="text-sm text-th-text-2 mb-6 leading-relaxed">{info.subtitle}</p>

              {/* plan card */}
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4 mb-5">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-bold text-th-text-1">
                    IMMORA {plan.name}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">
                    14 jours d&apos;essai · sans CB
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-th-text-1">{plan.priceAnnual.toFixed(2).replace('.', ',')}€</span>
                  <span className="text-xs text-th-text-2">/mois (annuel)</span>
                  <span className="text-xs text-th-text-3 line-through ml-auto">{plan.priceMonthly.toFixed(2).replace('.', ',')}€/mois</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleUpgrade}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
                >
                  {plan.cta}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                <Link
                  href="/#pricing"
                  onClick={close}
                  className="text-center text-xs text-th-text-2 hover:text-th-text-1 underline underline-offset-2 transition-colors"
                >
                  Voir tous les plans
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </UpgradeContext.Provider>
  )
}

/**
 * Hook pour ouvrir le modal Upgrade depuis n'importe où.
 * Renvoie un no-op si le provider n'est pas monté (zone publique).
 */
export function useUpgrade(): UpgradeContextValue {
  const ctx = useContext(UpgradeContext)
  return ctx ?? { prompt: () => {}, close: () => {} }
}
