'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const plans = [
  {
    id: 'free',
    name: 'Gratuit',
    price: { monthly: 0, annual: 0 },
    description: 'Pour découvrir et tester',
    badge: null,
    features: [
      'Analyse express illimitée',
      'Score d\'opportunité basique',
      '3 simulations sauvegardées',
      'Export PDF (filigrane)',
      'Données marché basiques',
    ],
    missing: [
      'Fiscalité avancée',
      'Analyse IA',
      'Export Excel',
      'Comparaison multi-biens',
    ],
    cta: 'Commencer gratuitement',
    ctaVariant: 'outline' as const,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 29, annual: 19 },
    description: 'Pour l\'investisseur sérieux',
    badge: 'Populaire',
    features: [
      'Tout le plan Gratuit',
      'Fiscalité : 10 régimes analysés',
      'Analyse IA (GPT-4) incluse',
      'Export PDF & Excel pro',
      'Simulations illimitées',
      'Comparaison multi-biens',
      'Données marché complètes',
      'Support prioritaire',
    ],
    missing: [],
    cta: 'Essai 14 jours gratuit',
    ctaVariant: 'primary' as const,
  },
  {
    id: 'agency',
    name: 'Agence',
    price: { monthly: 79, annual: 59 },
    description: 'Pour les professionnels',
    badge: null,
    features: [
      'Tout le plan Pro',
      'Jusqu\'à 5 utilisateurs',
      'Rapports avec votre logo',
      'API access',
      'Exports en masse',
      'Onboarding dédié',
      'SLA 99.9%',
    ],
    missing: [],
    cta: 'Contacter l\'équipe',
    ctaVariant: 'secondary' as const,
  },
]

export function Pricing() {
  const [annual, setAnnual] = useState(true)
  const router = useRouter()

  return (
    <section id="pricing" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center space-y-4 mb-12">
          <Badge variant="emerald">Tarifs</Badge>
          <h2 className="text-4xl font-bold text-white">
            Simple et{' '}
            <span className="gradient-text">transparent</span>
          </h2>
          <p className="text-lg text-zinc-400">
            Commencez gratuitement. Passez Pro quand vous êtes prêt.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className={`text-sm ${!annual ? 'text-white' : 'text-zinc-500'}`}>Mensuel</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-emerald-500' : 'bg-zinc-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${annual ? 'left-7' : 'left-1'}`} />
            </button>
            <span className={`text-sm ${annual ? 'text-white' : 'text-zinc-500'}`}>
              Annuel
              <Badge variant="emerald" className="ml-2 text-xs">-35%</Badge>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => {
            const price = annual ? plan.price.annual : plan.price.monthly
            const isPro = plan.id === 'pro'

            return (
              <Card
                key={plan.id}
                className={`p-6 space-y-6 ${isPro ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20' : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-semibold text-white">{plan.name}</span>
                    {plan.badge && <Badge variant="emerald">{plan.badge}</Badge>}
                  </div>
                  <p className="text-sm text-zinc-500">{plan.description}</p>
                </div>

                <div>
                  {price === 0 ? (
                    <div className="text-4xl font-black text-white">Gratuit</div>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-black text-white">{price}€</span>
                      <span className="text-zinc-500 text-sm mb-1">/mois</span>
                    </div>
                  )}
                  {annual && price > 0 && (
                    <p className="text-xs text-zinc-500 mt-1">Facturé {price * 12}€/an</p>
                  )}
                </div>

                <Button
                  variant={plan.ctaVariant}
                  className="w-full"
                  onClick={() => router.push(plan.id === 'agency' ? '/contact' : '/auth/signup')}
                >
                  {plan.cta}
                </Button>

                <div className="space-y-2.5">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                      <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </div>
                  ))}
                  {plan.missing.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                      <svg className="w-4 h-4 text-zinc-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>

        <p className="text-center text-sm text-zinc-600 mt-8">
          Paiement sécurisé par Stripe · Résiliation à tout moment · Aucune surprise
        </p>
      </div>
    </section>
  )
}
