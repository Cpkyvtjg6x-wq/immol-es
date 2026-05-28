'use client'

import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    badge: 'Instant',
    title: 'Analyse en 30 secondes',
    description: 'Saisissez le prix et le loyer estimé. Obtenez immédiatement le rendement brut, net, nette-nette et le cashflow mensuel. Zéro tableur.',
    color: 'emerald',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    badge: 'Complet',
    title: '10 régimes fiscaux analysés',
    description: 'Micro-foncier, Réel, LMNP, LMP, SCI IS/IR, SARL de famille... L\'outil compare tous les régimes et recommande le plus avantageux pour votre situation.',
    color: 'indigo',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    badge: 'IA',
    title: 'Score et insights IA',
    description: 'Un score d\'opportunité de 0 à 100 analysant la rentabilité, le cashflow, la fiscalité et le marché local. Des recommandations personnalisées par GPT-4.',
    color: 'amber',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    badge: 'Marché',
    title: 'Données par quartier',
    description: 'Prix au m² actualisés, rendements moyens du marché, couverture nationale. Comparez votre deal aux standards du secteur.',
    color: 'blue',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    badge: 'Export',
    title: 'PDF & Excel pro',
    description: 'Générez des rapports PDF de présentation bancaire ou des exports Excel avec tableau d\'amortissement complet. Idéal pour négocier votre financement.',
    color: 'emerald',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    badge: 'Pro',
    title: 'Bibliothèque de simulations',
    description: 'Sauvegardez, comparez et retrouvez toutes vos analyses. Gérez votre pipeline d\'investissements depuis un tableau de bord centralisé.',
    color: 'indigo',
  },
]

const colorMap = {
  emerald: { badge: 'emerald' as const, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400', border: 'hover:border-emerald-800/40' },
  indigo: { badge: 'indigo' as const, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-400', border: 'hover:border-indigo-800/40' },
  amber: { badge: 'amber' as const, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400', border: 'hover:border-amber-800/40' },
  blue: { badge: 'blue' as const, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400', border: 'hover:border-blue-800/40' },
}

export function Features() {
  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <Badge variant="indigo">Fonctionnalités</Badge>
          <h2 className="text-4xl font-bold text-white">
            Tout ce qu'il faut pour{' '}
            <span className="gradient-text">décider vite, bien</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Conçu pour les investisseurs qui veulent des données précises, pas des approximations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat) => {
            const c = colorMap[feat.color as keyof typeof colorMap]
            return (
              <Card key={feat.title} hover className={`p-6 ${c.border}`}>
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className={`w-11 h-11 rounded-xl ${c.iconBg} flex items-center justify-center ${c.iconColor}`}>
                      {feat.icon}
                    </div>
                    <Badge variant={c.badge}>{feat.badge}</Badge>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">{feat.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{feat.description}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
