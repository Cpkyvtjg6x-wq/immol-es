'use client'

import { useState } from 'react'
import { InvestmentResult, FiscalRegime, InvestmentParams, ScoreResult, AIInsight } from '@/lib/types'
import type { LocalMarketData } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { ScoreCard } from '@/components/app/ScoreCard'
import { KpiGrid } from '@/components/app/KpiGrid'
import { MarketContextBlock } from '@/components/app/MarketContextBlock'
import { AIInsights } from '@/components/app/AIInsights'
import { ScenarioPanel } from '@/components/app/ScenarioPanel'
import { CashflowTab, ReventeTab, AmortTab, ProjectionTab } from '@/components/app/DetailedResults'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ResultTabsProps {
  result: InvestmentResult
  fiscalResults: FiscalRegime[] | null
  params: InvestmentParams
  score: ScoreResult
  bestFiscal: { yield: number; regime: string } | null
  marketData: LocalMarketData | null
  marketLoading: boolean
  insights: AIInsight[] | null
  aiLoading: boolean
  isPro?: boolean
  onGenerateAI: () => void
  onApplyScenario: (params: InvestmentParams) => void
  onApplyRenovationScenario: (travaux: number, prixAchat: number) => void
}

// ─── Données pédagogiques par régime ─────────────────────────────────────────

const REGIME_EXPLICATIONS: Record<string, {
  court: string
  detail: string
  pratique: string[]
}> = {
  'micro-foncier': {
    court: 'Abattement automatique de 30% sur vos revenus fonciers — simple, sans comptable.',
    detail: "Le régime micro-foncier s'applique si vous louez un bien nu (non meublé) et que vos revenus locatifs annuels ne dépassent pas 15 000 €. L'administration fiscale applique automatiquement un abattement de 30% sur vos loyers — vous ne déduisez pas vos vraies charges, mais la déclaration est ultra-simple.",
    pratique: [
      'Remplissez uniquement la case 4BE de votre déclaration de revenus',
      "Indiquez vos loyers bruts — l'abattement de 30% est calculé automatiquement",
      'Aucun comptable requis — idéal si vos charges réelles sont faibles',
      'Attention : si vos charges dépassent 30% des loyers, le régime réel sera plus avantageux',
    ],
  },
  'reel-foncier': {
    court: 'Déduisez toutes vos vraies charges — idéal si vous avez des travaux ou des intérêts élevés.',
    detail: "Le régime réel foncier vous permet de déduire l'ensemble de vos charges réelles : intérêts d'emprunt, taxe foncière, travaux d'entretien, assurances, charges de copropriété... Si vos charges dépassent vos loyers, vous créez un déficit foncier imputable sur votre revenu global (plafonné à 10 700 €/an).",
    pratique: [
      'Conservez absolument toutes vos factures et justificatifs',
      'Remplissez le formulaire 2044 lors de votre déclaration annuelle',
      "Déduisez intérêts d'emprunt, travaux, assurances, charges de copro, taxe foncière",
      'Un comptable est recommandé si les charges sont nombreuses ou complexes',
    ],
  },
  'micro-bic': {
    court: 'Abattement forfaitaire de 50% sur vos revenus de location meublée — simple mais limité.',
    detail: "En tant que loueur meublé non professionnel sous le régime micro-BIC, l'administration fiscale applique automatiquement un abattement de 50% (71% pour le saisonnier) sur vos recettes. C'est très simple et sans gestion lourde, mais vous ne pouvez pas déduire les amortissements, ce qui le rend souvent moins avantageux que le LMNP Réel.",
    pratique: [
      'Remplissez la case 5ND de votre déclaration de revenus',
      "Indiquez vos recettes brutes — l'abattement de 50% est calculé automatiquement",
      "Aucun comptable obligatoire — idéal pour débuter ou si vos revenus sont faibles",
      "Plafond à 77 700 €/an de recettes (au-delà : régime réel obligatoire)",
    ],
  },
  'lmnp-reel': {
    court: "Amortissez votre bien et vos travaux pour réduire (ou annuler) votre imposition pendant 10-15 ans.",
    detail: "C'est le régime star de l'investissement locatif meublé. En LMNP Réel, vous déduisez l'amortissement comptable de votre bien (environ 3-4% de sa valeur par an) et de vos travaux de vos revenus locatifs — ce qui réduit souvent votre base imposable à zéro pendant 10 à 15 ans. Vous payez très peu ou pas d'impôts tout en encaissant des loyers.",
    pratique: [
      "Faites appel à un expert-comptable spécialisé LMNP (budget : 500-900 €/an)",
      "Déclarez votre activité au Centre de Formalités des Entreprises (CFE) de votre chambre de commerce",
      "Remplissez le formulaire 2031 + liasse fiscale BIC chaque année",
      "Chaque année, votre comptable calcule l'amortissement et optimise votre déclaration",
    ],
  },
  'lmp': {
    court: "Statut professionnel — déficit déductible sur tous vos revenus, exonération plus-value après 5 ans.",
    detail: "Le statut LMP (Loueur Meublé Professionnel) s'applique si vos revenus meublés dépassent 23 000 €/an ET représentent plus de 50% de vos revenus totaux. Il offre des avantages puissants (déficits imputables sur le revenu global, exonération de plus-value après 5 ans si < 90 000 €/an) mais entraîne des cotisations sociales élevées (~40%).",
    pratique: [
      "Vérifiez les deux conditions : recettes > 23 000 €/an ET > 50% de vos revenus",
      "Inscription obligatoire au Registre du Commerce et des Sociétés (RCS)",
      "Comptable obligatoire — liasse fiscale BIC",
      "Cotisations sociales TNS à prévoir dans votre budget (~40% des bénéfices)",
    ],
  },
  'sci-ir': {
    court: "Investissez via une société transparente — idéal pour investir à plusieurs ou préparer la transmission.",
    detail: "La SCI à l'IR est une société civile immobilière dont les revenus sont imposés directement entre les mains des associés (transparence fiscale). Elle facilite la gestion à plusieurs et la transmission du patrimoine à vos enfants. En revanche, elle ne permet pas d'amortir le bien, ce qui la rend moins optimale fiscalement qu'une SCI à l'IS.",
    pratique: [
      "Rédigez des statuts de SCI avec un notaire ou un avocat (~1 500-3 000 €)",
      "Ouvrez un compte bancaire professionnel au nom de la SCI",
      "Tenez une comptabilité annuelle (obligatoire, même simplifiée)",
      "Chaque associé déclare sa quote-part des revenus dans sa déclaration personnelle",
    ],
  },
  'sci-is': {
    court: "IS à 15% et amortissement du bien — idéal pour capitaliser sans distribuer les bénéfices.",
    detail: "La SCI à l'IS est soumise à l'impôt sur les sociétés (15% sur les premiers 42 500 €, 25% au-delà). Elle peut amortir le bien, ce qui réduit son résultat imposable. L'inconvénient : la sortie d'argent en dividendes est taxée une seconde fois. Cette structure est idéale pour accumuler du patrimoine sans sortir les gains immédiatement.",
    pratique: [
      "Option pour l'IS à formuler auprès du fisc dans les 3 mois de la création",
      "Comptabilité d'entreprise complète obligatoire (bilan, compte de résultat)",
      "Liasse fiscale annuelle à déposer — comptable obligatoire",
      "Planifiez la sortie des dividendes avec votre comptable pour optimiser la double imposition",
    ],
  },
  'sarl-famille': {
    court: "Investissez en famille avec les avantages du LMNP Réel — amortissements + transparence IR.",
    detail: "La SARL de famille permet d'investir à plusieurs membres d'une même famille avec l'option fiscale IR (transparence) et les avantages du LMNP Réel (amortissements déductibles). C'est une structure plus formelle qu'un investissement en nom propre, mais elle combine protection familiale et optimisation fiscale.",
    pratique: [
      "Tous les associés doivent être de la même famille (parents, enfants, frères, sœurs, conjoints)",
      "Rédigez des statuts + immatriculation au RCS",
      "Option pour le régime IR à formuler dès la création",
      "Comptable spécialisé obligatoire pour gérer les amortissements LMNP",
    ],
  },
}

// ─── Tab nav button ────────────────────────────────────────────────────────────

function TabButton({
  label, badge, active, onClick,
}: {
  label: string; badge?: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-3 text-[12px] font-semibold whitespace-nowrap transition-colors ${
        active ? 'text-white' : 'text-th-text-2 hover:text-th-text-1'
      }`}
    >
      <span className="flex items-center gap-1.5">
        {label}
        {badge && (
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
            {badge}
          </span>
        )}
      </span>
      {active && (
        <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-emerald-500 rounded-t-full" />
      )}
    </button>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-widest mb-3">{children}</p>
  )
}

// ─── Résumé tab ───────────────────────────────────────────────────────────────

function ResumeTab({
  result, params, score, bestFiscal,
  marketData, marketLoading,
  insights, aiLoading, isPro, onGenerateAI, onApplyScenario,
}: {
  result: InvestmentResult
  params: InvestmentParams
  score: ScoreResult
  bestFiscal: { yield: number; regime: string } | null
  marketData: LocalMarketData | null
  marketLoading: boolean
  insights: AIInsight[] | null
  aiLoading: boolean
  isPro?: boolean
  onGenerateAI: () => void
  onApplyScenario: (params: InvestmentParams) => void
}) {
  return (
    <div className="space-y-7">
      <ScoreCard score={score} />
      <div>
        <SectionLabel>Indicateurs clés</SectionLabel>
        <KpiGrid
          result={result}
          netNetYield={bestFiscal?.yield}
          netNetRegime={bestFiscal?.regime}
          params={params}
        />
      </div>
      {(marketData || marketLoading) && (
        <div>
          <SectionLabel>Marché local</SectionLabel>
          {marketLoading && !marketData ? (
            <MarketContextBlock data={{} as LocalMarketData} surface={params.surface} prixAchat={params.prixAchat} loading />
          ) : marketData ? (
            <MarketContextBlock data={marketData} surface={params.surface} prixAchat={params.prixAchat} />
          ) : null}
        </div>
      )}
      <div>
        <SectionLabel>Analyse IA</SectionLabel>
        <AIInsights insights={insights} loading={aiLoading} onGenerate={onGenerateAI} isPro={isPro ?? false} />
      </div>
      <div>
        <SectionLabel>Scénarios & équilibre</SectionLabel>
        <ScenarioPanel baseParams={params} baseResult={result} onApplyScenario={onApplyScenario} />
      </div>
    </div>
  )
}

// ─── Fiscalité tab — version enrichie ────────────────────────────────────────

function FiscaliteTab({
  fiscalResults,
  params,
}: {
  fiscalResults: FiscalRegime[] | null
  params: InvestmentParams
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (!fiscalResults || fiscalResults.length === 0) {
    return (
      <div className="py-24 text-center space-y-5 px-8">
        <div className="w-14 h-14 rounded-2xl bg-th-surface2 border border-th-border flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-th-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-[16px] font-semibold text-th-text-1 mb-2">Renseignez votre TMI</p>
          <p className="text-[13px] text-th-text-2 max-w-sm mx-auto leading-relaxed">
            Dans la section Fiscalité du formulaire, sélectionnez votre tranche marginale d&apos;imposition pour obtenir une analyse personnalisée.
          </p>
        </div>
      </div>
    )
  }

  /* ── données ── */

  const enabled = fiscalResults.filter((r) => !r.disabled)
  const disabled = fiscalResults.filter((r) => r.disabled)
  const sorted = [...enabled].sort((a, b) => b.rendNetNet - a.rendNetNet)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  const bestExpl = REGIME_EXPLICATIONS[best?.id ?? ''] ?? null
  const economieImpot = worst && sorted.length > 1 ? Math.round(worst.totalFiscal - best.totalFiscal) : 0
  const selected = sorted.find((r) => r.id === selectedId) ?? best
  const selectedExpl = REGIME_EXPLICATIONS[selected?.id ?? ''] ?? null

  const maxRendement = Math.max(...sorted.map((r) => r.rendNetNet), 0.1)

  if (!best) return null

  return (
    <div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ZONE A — Hero régime recommandé (pleine largeur, bulle avec contour) */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-th-border px-8 py-10">
        {/* Header badge */}
        <div className="flex items-center gap-3 mb-7">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Régime optimal · TMI {params.tmi}%</p>
          </div>
          {economieImpot > 500 && (
            <div className="flex items-center gap-2 rounded-full border border-th-border-med bg-th-surface2 px-3.5 py-1.5">
              <p className="text-[11px] font-semibold text-th-text-1">
                Économie jusqu&apos;à <span className="text-emerald-400 font-bold">+{formatCurrency(economieImpot)}/an</span> vs. le pire régime
              </p>
            </div>
          )}
        </div>

        {/* Card principale — bulle avec contour */}
        <div className="rounded-2xl border border-emerald-500/20 bg-th-surface p-8">
          <div className="flex items-start gap-12">

            {/* Gauche */}
            <div className="flex-1 min-w-0 space-y-6">
              <div>
                <h2
                  className="text-[28px] font-black text-th-text-1 leading-tight"
                  style={{ letterSpacing: '-0.04em' }}
                >
                  {best.name}
                </h2>
                {bestExpl && (
                  <p className="text-[14px] text-th-text-1 mt-3 leading-relaxed max-w-xl">
                    {bestExpl.detail}
                  </p>
                )}
              </div>

              {/* Étapes concrètes */}
              {bestExpl && (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-wider">
                    Comment mettre en place ce régime
                  </p>
                  {bestExpl.pratique.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-th-border bg-th-surface2 px-4 py-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-black text-emerald-400">{i + 1}</span>
                      </div>
                      <p className="text-[13px] text-th-text-1 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Droite — métriques */}
            <div className="shrink-0 space-y-4 text-right min-w-[160px]">
              <div>
                <p className="text-[11px] text-emerald-500/70 font-semibold uppercase tracking-wider mb-1">
                  Rendement nette-nette
                </p>
                <p
                  className="font-black text-emerald-400 tabular-nums leading-none"
                  style={{ fontSize: '48px', letterSpacing: '-0.05em' }}
                >
                  {best.rendNetNet.toFixed(1)}%
                </p>
              </div>

              <div className="h-px bg-th-surface2" />

              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-th-text-3 uppercase tracking-wider mb-0.5">Impôts / an</p>
                  <p className="text-[20px] font-black text-red-400 tabular-nums leading-none" style={{ letterSpacing: '-0.03em' }}>
                    {formatCurrency(best.impot)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-th-text-3 uppercase tracking-wider mb-0.5">Cashflow / mois</p>
                  <p className={`text-[20px] font-black tabular-nums leading-none ${best.cfNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`} style={{ letterSpacing: '-0.03em' }}>
                    {best.cfNet >= 0 ? '+' : ''}{formatCurrency(best.cfNet)}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ZONE A.5 — Avant / Après (si >= 2 régimes éligibles)               */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {sorted.length >= 2 && economieImpot > 0 && (
        <div className="border-b border-th-border px-8 py-8">
          <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-wider mb-5">
            Impact de l&apos;optimisation fiscale — Avant / Après
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-stretch">

            {/* Avant — pire régime */}
            <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.02] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border border-red-500/30 bg-red-500/10 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-red-400/60 uppercase tracking-wider">Sans optimisation</p>
                  <p className="text-[13px] font-bold text-th-text-2">{worst!.name}</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Impôts / an', value: formatCurrency(worst!.impot), color: 'text-red-400' },
                  { label: 'Cashflow / mois', value: `${worst!.cfNet >= 0 ? '+' : ''}${formatCurrency(worst!.cfNet)}`, color: worst!.cfNet >= 0 ? 'text-th-text-1' : 'text-red-400' },
                  { label: 'Rendement nette-nette', value: `${worst!.rendNetNet.toFixed(1)} %`, color: worst!.rendNetNet >= 3 ? 'text-th-text-1' : 'text-red-400' },
                ].map((m) => (
                  <div key={m.label} className="flex items-center justify-between">
                    <p className="text-[11px] text-th-text-3">{m.label}</p>
                    <p className={`text-[13px] font-bold tabular-nums ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Flèche centrale + économie */}
            <div className="flex flex-col items-center justify-center gap-2 px-2 min-w-[100px]">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-center">
                <p className="text-[9px] text-emerald-400/60 uppercase tracking-wider mb-0.5">Économie/an</p>
                <p className="text-[16px] font-black text-emerald-400 tabular-nums leading-none" style={{ letterSpacing: '-0.03em' }}>
                  +{formatCurrency(economieImpot)}
                </p>
              </div>
              <svg className="w-5 h-5 text-emerald-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <div className="text-center">
                <p className="text-[9px] text-th-text-3 uppercase tracking-wider">Sur 10 ans</p>
                <p className="text-[14px] font-black text-emerald-400 tabular-nums leading-none" style={{ letterSpacing: '-0.03em' }}>
                  +{formatCurrency(economieImpot * 10)}
                </p>
              </div>
            </div>

            {/* Après — meilleur régime */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border border-emerald-500/30 bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-emerald-400/60 uppercase tracking-wider">Avec optimisation</p>
                  <p className="text-[13px] font-bold text-th-text-1">{best.name}</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Impôts / an', value: formatCurrency(best.impot), color: 'text-red-400' },
                  { label: 'Cashflow / mois', value: `${best.cfNet >= 0 ? '+' : ''}${formatCurrency(best.cfNet)}`, color: best.cfNet >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'Rendement nette-nette', value: `${best.rendNetNet.toFixed(1)} %`, color: best.rendNetNet >= 4 ? 'text-emerald-400' : best.rendNetNet >= 2 ? 'text-amber-400' : 'text-red-400' },
                ].map((m) => (
                  <div key={m.label} className="flex items-center justify-between">
                    <p className="text-[11px] text-th-text-3">{m.label}</p>
                    <p className={`text-[13px] font-bold tabular-nums ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ZONE B — Comparatif visuel + sélecteur de régime                   */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-th-border">

        {/* Label section */}
        <div className="px-8 pt-8 pb-5 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-th-text-1">
              Comparatif des {sorted.length} régimes éligibles
            </p>
            <p className="text-[11px] text-th-text-3 mt-0.5">Cliquez sur une ligne pour afficher la fiche complète ↓</p>
          </div>
        </div>

        {/* Barres horizontales + sélecteur */}
        <div className="px-8 pb-8 space-y-2">
          {sorted.map((r, i) => {
            const isBest = i === 0
            const isSelected = r.id === (selectedId ?? best.id)
            const nnGood = r.rendNetNet >= 4
            const nnOk = r.rendNetNet >= 2
            const barColor = nnGood ? '#10b981' : nnOk ? '#f59e0b' : '#ef4444'
            const nnColor = nnGood ? 'text-emerald-400' : nnOk ? 'text-amber-400' : 'text-red-400'
            const barW = Math.max(4, (r.rendNetNet / maxRendement) * 100)

            return (
              <div
                key={r.id}
                className={`group flex items-center gap-5 rounded-xl px-4 py-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-th-surface2 border border-th-border-med'
                    : 'hover:bg-th-surface2 border border-th-border hover:border-th-border-med'
                }`}
                onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
              >
                {/* Rang + nom */}
                <div className="flex items-center gap-3 w-56 shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    isBest ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-th-surface2 border border-th-border text-th-text-2'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[13px] font-bold truncate ${isBest ? 'text-white' : 'text-th-text-1'}`}>
                      {r.name}
                    </p>
                    {isBest && (
                      <span className="text-[9px] text-emerald-400 font-bold">★ Meilleur pour vous</span>
                    )}
                  </div>
                </div>

                {/* Barre */}
                <div className="flex-1 h-6 bg-th-surface2 rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all"
                    style={{ width: `${barW}%`, background: barColor, opacity: isBest ? 0.85 : 0.35 }}
                  />
                </div>

                {/* Valeur + impôts + CTA */}
                <div className="flex items-center gap-5 shrink-0 text-right">
                  <div>
                    <p className="text-[10px] text-th-text-3">Impôts/an</p>
                    <p className="text-[12px] text-red-400 font-bold tabular-nums">{formatCurrency(r.impot)}</p>
                  </div>
                  <div className="min-w-[52px]">
                    <p className="text-[10px] text-th-text-3">Net-nette</p>
                    <p className={`text-[18px] font-black tabular-nums ${nnColor}`} style={{ letterSpacing: '-0.03em' }}>
                      {r.rendNetNet.toFixed(1)}%
                    </p>
                  </div>
                  {/* CTA "Voir fiche" */}
                  <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-all ${
                    isSelected
                      ? 'border-th-border-med bg-th-surface2 text-th-text-1'
                      : 'border-th-border bg-transparent text-th-text-2 group-hover:text-th-text-1 group-hover:border-th-border-med'
                  }`}>
                    <span className="text-[11px] font-semibold whitespace-nowrap">
                      {isSelected ? 'Fermer' : 'Voir fiche'}
                    </span>
                    <svg
                      className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ZONE C — Fiche détaillée du régime sélectionné                     */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {selected && (
        <div className="px-8 py-8 space-y-6">

          {/* Titre fiche — bulle avec contour */}
          <div className="rounded-2xl border border-th-border-med bg-th-surface p-6">
            <div className="flex items-start justify-between gap-8 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 rounded-full bg-blue-400" />
                  <p className="text-[11px] font-semibold text-blue-400/70 uppercase tracking-widest">Fiche détaillée</p>
                </div>
                <h3 className="text-[22px] font-black text-th-text-1" style={{ letterSpacing: '-0.03em' }}>
                  {selected.name}
                </h3>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-th-text-3 uppercase tracking-wider mb-1">Rendement nette-nette</p>
                <p className={`font-black tabular-nums leading-none ${selected.rendNetNet >= 4 ? 'text-emerald-400' : selected.rendNetNet >= 2 ? 'text-amber-400' : 'text-red-400'}`} style={{ fontSize: '32px', letterSpacing: '-0.04em' }}>
                  {selected.rendNetNet.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Explication plain text */}
            {selectedExpl && (
              <p className="text-[14px] text-th-text-1 leading-relaxed border-t border-th-border pt-4">
                {selectedExpl.detail}
              </p>
            )}
          </div>

          {/* 4 métriques fiscales */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Revenu imposable', value: formatCurrency(selected.revImposable), color: 'text-th-text-1', sub: 'Base de calcul' },
              { label: 'Impôt sur le revenu', value: formatCurrency(selected.impot), color: 'text-red-400', sub: `TMI ${params.tmi}%` },
              { label: 'Prélèvements sociaux', value: formatCurrency(selected.ps), color: 'text-amber-400', sub: '17.2% fixe' },
              { label: 'Charge fiscale totale', value: formatCurrency(selected.totalFiscal), color: 'text-red-400', sub: 'IR + PS' },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl bg-th-surface border border-th-border p-5">
                <p className="text-[11px] text-th-text-3 mb-3 leading-tight">{m.label}</p>
                <p className={`text-[22px] font-black tabular-nums leading-none ${m.color}`} style={{ letterSpacing: '-0.03em' }}>
                  {m.value}
                </p>
                <p className="text-[10px] text-th-text-3 mt-2">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Étapes pratiques */}
          {selectedExpl && (
            <div className="space-y-3">
              <p className="text-[12px] font-semibold text-th-text-2 uppercase tracking-wider">
                Mise en place — étapes concrètes
              </p>
              <div className="grid grid-cols-2 gap-3">
                {selectedExpl.pratique.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl bg-th-surface border border-th-border px-4 py-3.5">
                    <div className="w-7 h-7 rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[11px] font-black text-blue-400">{i + 1}</span>
                    </div>
                    <p className="text-[13px] text-th-text-1 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Régimes non éligibles */}
      {disabled.length > 0 && (
        <div className="px-8 pb-8 border-t border-th-border pt-6">
          <p className="text-[11px] font-semibold text-th-text-3 uppercase tracking-wider mb-3">
            Non disponibles dans votre situation
          </p>
          <div className="space-y-1.5">
            {disabled.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-th-surface border border-th-border opacity-35">
                <p className="text-[13px] text-th-text-2 line-through">{r.name}</p>
                <p className="text-[11px] text-th-text-3 text-right max-w-[55%]">{r.disabledReason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Projections tab ──────────────────────────────────────────────────────────

function ProjectionsTab({ result }: { result: InvestmentResult }) {
  const [sub, setSub] = useState<'cashflow' | 'projection' | 'revente'>('cashflow')

  const subs = [
    { id: 'cashflow' as const, label: 'Cashflow détaillé' },
    { id: 'projection' as const, label: 'Projection 20 ans' },
    { id: 'revente' as const, label: 'Revente & TRI' },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-5 p-1 rounded-xl bg-th-surface2 border border-th-border w-fit">
        {subs.map((s) => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              sub === s.id
                ? 'bg-th-surface3 text-th-text-1 shadow-sm'
                : 'text-th-text-3 hover:text-th-text-1'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {sub === 'cashflow' && <CashflowTab result={result} />}
      {sub === 'projection' && <ProjectionTab result={result} />}
      {sub === 'revente' && <ReventeTab result={result} />}
    </div>
  )
}

// ─── Financement tab ──────────────────────────────────────────────────────────

function FinancementTab({ result, params }: { result: InvestmentResult; params: InvestmentParams }) {
  // ── Calcul impact travaux ──────────────────────────────────────────────────
  const hasTravaux = params.travaux > 0
  const prixRevientSansTravaux = result.prixRevient - params.travaux
  const rendBrutSansTravaux = prixRevientSansTravaux > 0
    ? Math.round((result.loyerAnnuelBrut / prixRevientSansTravaux) * 1000) / 10
    : 0
  const deltaRend = Math.round((result.rendementBrut - rendBrutSansTravaux) * 10) / 10
  const valorisationTravaux = Math.round(params.travaux * 1.1) // +10% plus-value estimée
  const pctPrixRevient = result.prixRevient > 0
    ? Math.round((params.travaux / result.prixRevient) * 100)
    : 0

  return (
    <div className="space-y-6">

      {/* ── 3 métriques crédit ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Mensualité totale',
            value: `${Math.round(result.mensualiteTotale)} €/mois`,
            sub: `Dont assurance ${Math.round(result.mensualiteTotale - result.mensualiteCredit)} €`,
            color: 'text-white',
          },
          {
            label: 'Coût total crédit',
            value: formatCurrency(result.coutCredit),
            sub: 'Intérêts sur la durée du prêt',
            color: 'text-red-400',
          },
          {
            label: 'Capital emprunté',
            value: formatCurrency(result.montantEmprunte),
            sub: 'Hors apport personnel',
            color: 'text-th-text-1',
          },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-th-border bg-th-surface2 p-4">
            <p className="text-[9px] font-semibold text-th-text-3 uppercase tracking-wider mb-2">{m.label}</p>
            <p className={`text-[18px] font-black tabular-nums leading-none ${m.color}`} style={{ letterSpacing: '-0.03em' }}>
              {m.value}
            </p>
            <p className="text-[10px] text-th-text-3 mt-1.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Bloc Travaux (si budget > 0) ─────────────────────────────────────── */}
      {hasTravaux && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] overflow-hidden">

          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-th-border">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                  </svg>
                  <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-widest">Impact travaux</p>
                </div>
                <p className="text-[22px] font-black text-th-text-1 tabular-nums leading-none" style={{ letterSpacing: '-0.03em' }}>
                  {formatCurrency(params.travaux)}
                </p>
                <p className="text-[11px] text-th-text-2 mt-1">
                  {pctPrixRevient}% du prix de revient total · Financé au crédit
                </p>
              </div>

              {/* Valorisation estimée */}
              <div className="text-right shrink-0">
                <p className="text-[10px] text-th-text-3 uppercase tracking-wider mb-1">Valorisation estimée</p>
                <p className="text-[18px] font-black text-emerald-400 tabular-nums leading-none" style={{ letterSpacing: '-0.03em' }}>
                  +{formatCurrency(valorisationTravaux)}
                </p>
                <p className="text-[10px] text-th-text-3 mt-0.5">~+10% sur la valeur du bien</p>
              </div>
            </div>
          </div>

          {/* Impact rendement */}
          <div className="px-6 py-5">
            <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-wider mb-4">
              Impact sur le rendement brut
            </p>
            <div className="grid grid-cols-3 items-center gap-4">

              {/* Sans travaux */}
              <div className="rounded-xl border border-th-border bg-th-surface p-4 text-center">
                <p className="text-[10px] text-th-text-3 mb-2">Sans travaux</p>
                <p className="text-[24px] font-black text-th-text-2 tabular-nums leading-none" style={{ letterSpacing: '-0.04em' }}>
                  {rendBrutSansTravaux.toFixed(1)}%
                </p>
                <p className="text-[10px] text-th-text-3 mt-1.5">
                  Base {formatCurrency(prixRevientSansTravaux)}
                </p>
              </div>

              {/* Flèche + delta */}
              <div className="flex flex-col items-center gap-2">
                <div className={`rounded-lg border px-3 py-1.5 text-center ${deltaRend >= 0 ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-red-500/20 bg-red-500/[0.05]'}`}>
                  <p className={`text-[14px] font-black tabular-nums ${deltaRend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {deltaRend >= 0 ? '+' : ''}{deltaRend.toFixed(1)} pts
                  </p>
                </div>
                <svg className="w-5 h-5 text-th-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <p className="text-[10px] text-th-text-3 text-center leading-snug">
                  {deltaRend >= 0
                    ? 'Les travaux améliorent le rendement'
                    : 'Les travaux pèsent sur le rendement'}
                </p>
              </div>

              {/* Avec travaux */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 text-center">
                <p className="text-[10px] text-amber-400/60 mb-2">Avec travaux</p>
                <p className={`text-[24px] font-black tabular-nums leading-none ${result.rendementBrut >= 6 ? 'text-emerald-400' : result.rendementBrut >= 4 ? 'text-amber-400' : 'text-th-text-1'}`} style={{ letterSpacing: '-0.04em' }}>
                  {result.rendementBrut.toFixed(1)}%
                </p>
                <p className="text-[10px] text-th-text-3 mt-1.5">
                  Base {formatCurrency(result.prixRevient)}
                </p>
              </div>

            </div>

            {/* Note pédagogique */}
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-th-border bg-th-surface px-4 py-3">
              <svg className="w-3.5 h-3.5 text-th-text-3 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p className="text-[11px] text-th-text-3 leading-relaxed">
                Le budget travaux est financé au crédit et intégré dans le prix de revient. L&apos;impact fiscal (déficit foncier, amortissement LMNP/LMP) est calculé dans l&apos;onglet <span className="text-th-text-2 font-semibold">Fiscalité</span>.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ── Tableau d'amortissement ──────────────────────────────────────────── */}
      <AmortTab result={result} />
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ResultTabs({
  result, fiscalResults, params, score, bestFiscal,
  marketData, marketLoading,
  insights, aiLoading, isPro,
  onGenerateAI, onApplyScenario, onApplyRenovationScenario,
}: ResultTabsProps) {

  const [tab, setTab] = useState<'resume' | 'fiscalite' | 'projections' | 'financement'>('resume')

  // Suppress unused warning — kept for future use
  void onApplyRenovationScenario

  const hasFiscal = fiscalResults && fiscalResults.filter((r) => !r.disabled).length > 0
  const fiscalCount = hasFiscal ? fiscalResults!.filter((r) => !r.disabled).length : undefined

  const tabs = [
    { id: 'resume' as const, label: 'Résumé' },
    { id: 'fiscalite' as const, label: 'Fiscalité', badge: fiscalCount ? String(fiscalCount) : undefined },
    { id: 'projections' as const, label: 'Projections' },
    { id: 'financement' as const, label: 'Financement' },
  ]

  return (
    <div>
      {/* ── Tabs nav — sticky dans le scroll du parent ──────────────────── */}
      <div className="sticky top-0 z-10 bg-th-bg/95 backdrop-blur-xl border-b border-th-border">
        {/* Titre + sous-titre */}
        <div className="px-6 pt-4 flex items-end justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[15px] font-semibold text-th-text-1" style={{ letterSpacing: '-0.02em' }}>
              Analyse complète
            </h2>
            {hasFiscal && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Fiscal inclus
              </span>
            )}
          </div>
          <p className="text-[12px] text-th-text-2 pb-0.5">
            {result.ville} · {formatCurrency(result.prixRevient)}
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex px-2">
          {tabs.map((t) => (
            <TabButton
              key={t.id}
              label={t.label}
              badge={t.badge}
              active={tab === t.id}
              onClick={() => setTab(t.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className={tab === 'fiscalite' ? '' : 'px-6 py-6 max-w-4xl'}>

        {tab === 'resume' && (
          <ResumeTab
            result={result}
            params={params}
            score={score}
            bestFiscal={bestFiscal}
            marketData={marketData}
            marketLoading={marketLoading}
            insights={insights}
            aiLoading={aiLoading}
            isPro={isPro}
            onGenerateAI={onGenerateAI}
            onApplyScenario={onApplyScenario}
          />
        )}

        {tab === 'fiscalite' && (
          <FiscaliteTab fiscalResults={fiscalResults} params={params} />
        )}

        {tab === 'projections' && (
          <ProjectionsTab result={result} />
        )}

        {tab === 'financement' && (
          <FinancementTab result={result} params={params} />
        )}

      </div>
    </div>
  )
}
