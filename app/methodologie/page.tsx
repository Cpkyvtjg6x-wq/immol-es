'use client'

import Link from 'next/link'
import { Navbar } from '@/components/landing/Navbar'
import { SOURCES, SOURCE_TYPE_LABELS, DERNIERE_MAJ_DONNEES, type SourceType } from '@/lib/sources'
import {
  IconBuildingLibrary, IconChartBar, IconScale, IconCheckCircle, IconExclamationTriangle, IconHome,
} from '@/components/ui/icons'

const TYPE_STYLES: Record<SourceType, string> = {
  officielle:    'text-emerald-400 bg-emerald-500/[0.12] border-emerald-500/20',
  observatoire:  'text-sky-400 bg-sky-500/[0.12] border-sky-500/20',
  estimation:    'text-amber-400 bg-amber-500/[0.12] border-amber-500/20',
  reglementaire: 'text-indigo-400 bg-indigo-500/[0.12] border-indigo-500/20',
}

const CALCULS: { titre: string; desc: string; Icon: React.FC<{ className?: string }> }[] = [
  {
    titre: 'Rentabilité',
    desc: 'Rendement brut (loyers annuels / prix d’achat), net (après charges réelles) et net-net (après impôts et prélèvements sociaux). Le rendement net rapporte au prix de revient (achat + frais de notaire + travaux).',
    Icon: IconChartBar,
  },
  {
    titre: 'Cash-flow & financement',
    desc: 'Mensualité calculée en annuité constante (ou intérêts seuls en in-fine), assurance et frais inclus. Cash-flow = revenus nets de charges − mensualité. Point mort et effort d’épargne affichés.',
    Icon: IconHome,
  },
  {
    titre: 'Fiscalité (10 régimes)',
    desc: 'Micro-foncier, réel foncier, LMNP micro/réel, LMP, SCI à l’IR/IS, SARL de famille. Seuils et abattements de la loi de finances 2025. La TMI est appliquée comme taux marginal sur les revenus locatifs.',
    Icon: IconScale,
  },
  {
    titre: 'Plus-value & revente',
    desc: 'Abattements pour durée de détention (CGI art. 150 VC : exonération d’IR à 22 ans, de prélèvements sociaux à 30 ans), surtaxe sur plus-values élevées, et réintégration des amortissements pour les LMNP au réel (réforme 2025).',
    Icon: IconBuildingLibrary,
  },
]

export default function MethodologiePage() {
  return (
    <div className="min-h-screen bg-th-bg text-th-text-1">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 pt-28 pb-24">

        {/* Hero */}
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-4">
          <div className="w-4 h-px bg-emerald-500" /> Méthodologie
        </div>
        <h1 className="text-4xl font-black text-th-text-1 leading-tight mb-4">
          D’où viennent nos chiffres
        </h1>
        <p className="text-th-text-2 leading-relaxed max-w-2xl">
          Immora est un outil d’aide à la décision. Nous préférons la transparence à la prétention :
          voici nos sources, comment nous calculons, et nos limites — dites honnêtement.
        </p>
        <p className="text-xs text-th-text-3 mt-3">Dernière mise à jour des données de marché : {DERNIERE_MAJ_DONNEES}</p>

        {/* Sources */}
        <section className="mt-14">
          <h2 className="text-sm font-bold text-th-text-1 uppercase tracking-wider mb-5">Sources de données</h2>
          <div className="space-y-4">
            {SOURCES.map((s) => (
              <div key={s.id} className="rounded-2xl border border-th-border bg-th-surface p-5">
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-th-text-1">{s.name}</h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${TYPE_STYLES[s.type]}`}>
                    {SOURCE_TYPE_LABELS[s.type]}
                  </span>
                </div>
                <p className="text-xs text-th-text-2 leading-relaxed">{s.description}</p>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs font-semibold text-emerald-400 hover:underline">
                    Consulter la source ↗
                  </a>
                )}
                <p className="text-[10px] text-th-text-3 mt-2">Mise à jour : {s.lastUpdate}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Calculs */}
        <section className="mt-14">
          <h2 className="text-sm font-bold text-th-text-1 uppercase tracking-wider mb-5">Comment on calcule</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {CALCULS.map((c) => (
              <div key={c.titre} className="rounded-2xl border border-th-border bg-th-surface p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-th-surface2 border border-th-border flex items-center justify-center shrink-0">
                    <c.Icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-th-text-1">{c.titre}</h3>
                </div>
                <p className="text-xs text-th-text-2 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Limites */}
        <section className="mt-14">
          <h2 className="text-sm font-bold text-th-text-1 uppercase tracking-wider mb-5">Nos limites — en toute honnêteté</h2>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5 space-y-3">
            {[
              'Les prix et loyers affichés sont des estimations indicatives, pas des valeurs contractuelles. La réalité d’un bien précis peut s’en écarter.',
              'Les calculs fiscaux sont des simulations basées sur la réglementation 2025 et des hypothèses standard ; ils ne remplacent pas l’avis d’un expert-comptable ou d’un notaire.',
              'Le résultat fiscal est calculé pour l’année 1 (intérêts d’emprunt maximaux) et s’ajuste dans le temps.',
              'Les données publiques (DVF) ont un délai de publication ; elles reflètent le passé récent, pas le marché à l’instant T.',
            ].map((t) => (
              <div key={t} className="flex items-start gap-2">
                <IconExclamationTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-th-text-2 leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Disclaimer + CTA */}
        <section className="mt-14 rounded-2xl border border-th-border bg-th-surface2 p-6">
          <div className="flex items-start gap-2 mb-4">
            <IconCheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-sm text-th-text-2 leading-relaxed">
              Immora vous aide à <span className="text-th-text-1 font-semibold">décider plus vite et mieux</span>,
              en rendant visibles des éléments souvent ignorés (fiscalité de sortie, cash-flow réel, charges complètes).
              La décision finale, et sa validation par un professionnel, vous appartiennent.
            </p>
          </div>
          <Link
            href="/analyse"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-950 bg-emerald-500 px-4 py-2 rounded-lg hover:bg-emerald-400 transition-colors"
          >
            Analyser un bien
          </Link>
        </section>

        <p className="text-[10px] text-th-text-3 mt-10 leading-relaxed">
          Immora fournit des informations à caractère indicatif et ne constitue pas un conseil en
          investissement, juridique ou fiscal au sens réglementaire. Aucune garantie n’est donnée quant
          à l’exactitude des estimations. Investir comporte des risques, notamment de perte en capital.
        </p>
      </div>
    </div>
  )
}
