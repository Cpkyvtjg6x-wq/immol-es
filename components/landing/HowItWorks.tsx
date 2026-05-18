import { Badge } from '@/components/ui/Badge'

const steps = [
  {
    num: '01',
    title: 'Saisissez l\'adresse et le prix',
    description: 'Prix d\'achat, loyer estimé, travaux éventuels. 30 secondes suffisent pour l\'analyse express.',
    color: 'from-emerald-500/20 to-emerald-500/5',
    accent: 'text-emerald-400',
  },
  {
    num: '02',
    title: 'Obtenez votre score d\'opportunité',
    description: 'Notre algorithme analyse le rendement, le cashflow, la fiscalité et les données de marché pour vous donner un score de 0 à 100.',
    color: 'from-indigo-500/20 to-indigo-500/5',
    accent: 'text-indigo-400',
  },
  {
    num: '03',
    title: 'Optimisez avec les recommandations IA',
    description: 'GPT-4 analyse votre profil et suggère le régime fiscal optimal, les améliorations possibles et les risques à surveiller.',
    color: 'from-amber-500/20 to-amber-500/5',
    accent: 'text-amber-400',
  },
  {
    num: '04',
    title: 'Exportez et décidez',
    description: 'Générez un rapport PDF pour votre banquier ou un Excel complet pour affiner. Sauvegardez dans votre bibliothèque.',
    color: 'from-blue-500/20 to-blue-500/5',
    accent: 'text-blue-400',
  },
]

export function HowItWorks() {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/30 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center space-y-4 mb-16">
          <Badge variant="zinc">Comment ça marche</Badge>
          <h2 className="text-4xl font-bold text-white">
            De l'adresse à la décision{' '}
            <span className="gradient-text">en 4 étapes</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={step.num} className="relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-zinc-700 to-transparent z-0" style={{ left: 'calc(100% - 1rem)' }} />
              )}

              <div className={`relative bg-gradient-to-b ${step.color} border border-zinc-800/60 rounded-2xl p-6 space-y-4`}>
                <div className={`text-3xl font-black ${step.accent} opacity-30`}>{step.num}</div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
