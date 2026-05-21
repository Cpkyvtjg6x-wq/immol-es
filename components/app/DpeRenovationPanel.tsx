'use client'

import { useState } from 'react'
import {
  calculateRenovation,
  DpeClass,
  ProfileRevenu,
  DPE_LABELS,
  DPE_COLORS,
  DPE_INTERDICTION,
  RenovationCalc,
} from '@/lib/renovation'
import { InvestmentParams, InvestmentResult } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

// ─── Badge DPE coloré ─────────────────────────────────────────────────────────

function DpeBadge({ dpe, size = 'md' }: { dpe: DpeClass; size?: 'sm' | 'md' | 'lg' }) {
  const c = DPE_COLORS[dpe]
  const cls =
    size === 'sm' ? 'w-7 h-7 text-sm' :
    size === 'lg' ? 'w-14 h-14 text-3xl' :
    'w-10 h-10 text-lg'
  return (
    <div
      className={`${cls} rounded-lg font-black flex items-center justify-center shrink-0`}
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {dpe}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  params: InvestmentParams
  result: InvestmentResult
  onApplyScenario?: (travaux: number, prixAchat: number) => void
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function DpeRenovationPanel({ params, result, onApplyScenario }: Props) {
  const dpeActuel = (params.dpe as DpeClass) || 'D'

  // DPE cibles disponibles (meilleures que l'actuel)
  const ordre: DpeClass[] = ['G', 'F', 'E', 'D', 'C', 'B', 'A']
  const idxActuel = ordre.indexOf(dpeActuel)
  const ciblesDisponibles = ordre.slice(idxActuel + 1)

  const [dpeCible, setDpeCible] = useState<DpeClass>(
    ciblesDisponibles.length >= 2 ? ciblesDisponibles[1] : ciblesDisponibles[0] ?? dpeActuel
  )
  const [profile, setProfile] = useState<ProfileRevenu>('intermediaire')
  const [budgetCustom, setBudgetCustom] = useState<number | undefined>(undefined)
  const [budgetInput, setBudgetInput] = useState('')

  // Loyer actuel
  const loyerMensuel =
    params.locType === 'meuble' || params.locType === 'saisonnier' ? params.loyerMeuble :
    params.locType === 'coloc' ? params.loyerParChambre * params.nbChambres :
    params.loyerNu

  // Calcul
  const calc: RenovationCalc = calculateRenovation(
    dpeActuel,
    dpeCible,
    params.surface,
    params.prixAchat,
    loyerMensuel,
    result.montantEmprunte,
    params.tmi,
    profile,
    params.locType,
    budgetCustom,
  )

  const isLmnp = params.locType === 'meuble' || params.locType === 'coloc' || params.locType === 'saisonnier'
  const urgence = calc.urgence
  const accentColor =
    urgence === 'critique' ? 'red' :
    urgence === 'elevee' ? 'orange' :
    urgence === 'moderee' ? 'amber' :
    'blue'

  const borderClass =
    urgence === 'critique' ? 'border-red-500/30' :
    urgence === 'elevee' ? 'border-orange-500/30' :
    urgence === 'moderee' ? 'border-amber-500/30' :
    'border-blue-500/20'

  const bgClass =
    urgence === 'critique' ? 'bg-red-500/[0.05]' :
    urgence === 'elevee' ? 'bg-orange-500/[0.05]' :
    urgence === 'moderee' ? 'bg-amber-500/[0.04]' :
    'bg-blue-500/[0.03]'

  const textClass =
    urgence === 'critique' ? 'text-red-400' :
    urgence === 'elevee' ? 'text-orange-400' :
    urgence === 'moderee' ? 'text-amber-400' :
    'text-blue-400'

  // Si aucune cible possible, on affiche un message
  if (ciblesDisponibles.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
        <DpeBadge dpe={dpeActuel} size="lg" />
        <p className="mt-3 text-sm font-semibold text-white">DPE {dpeActuel} — {DPE_LABELS[dpeActuel]}</p>
        <p className="text-xs text-zinc-500 mt-1">Aucune amélioration DPE disponible pour ce bien.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Bannière urgence ─────────────────────────────────────────────────── */}
      <div className={`rounded-xl border ${borderClass} ${bgClass} p-4 flex items-start gap-3`}>
        <DpeBadge dpe={dpeActuel} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-[13px] font-bold ${textClass}`}>
              DPE {dpeActuel} — {DPE_LABELS[dpeActuel]}
            </p>
            {DPE_INTERDICTION[dpeActuel] && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                urgence === 'critique' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                urgence === 'elevee' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                ⚠ {DPE_INTERDICTION[dpeActuel]}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{calc.recommandation}</p>
        </div>
      </div>

      {/* ── Configuration ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Paramètres de simulation</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* DPE cible */}
          <div>
            <label className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider block mb-1.5">
              DPE cible
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ciblesDisponibles.map((d) => (
                <button
                  key={d}
                  onClick={() => setDpeCible(d)}
                  className={`w-8 h-8 rounded-lg text-sm font-black transition-all ${
                    dpeCible === d ? 'ring-2 ring-white/40 scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: DPE_COLORS[d].bg,
                    color: DPE_COLORS[d].text,
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Profil revenus */}
          <div>
            <label className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider block mb-1.5">
              Profil revenus (MaPrimeRénov')
            </label>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value as ProfileRevenu)}
              className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-xs rounded-lg px-2 py-2 appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            >
              <option value="tres-modeste">Très modeste (aide 30%)</option>
              <option value="modeste">Modeste (aide 25%)</option>
              <option value="intermediaire">Intermédiaire (aide 20%)</option>
              <option value="superieur">Supérieur (aide 15%)</option>
            </select>
          </div>

          {/* Budget custom */}
          <div>
            <label className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider block mb-1.5">
              Budget travaux (optionnel)
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder={`~${Math.round(calc.coutMoyen / 1000)}k€ estimé`}
                value={budgetInput}
                onChange={(e) => {
                  setBudgetInput(e.target.value)
                  const v = parseInt(e.target.value)
                  setBudgetCustom(v > 0 ? v : undefined)
                }}
                className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-xs rounded-lg px-2 py-2 pr-6 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 placeholder:text-zinc-700"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600">€</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Coût des travaux ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Coût estimatif travaux</p>
            {/* Flèche DPE */}
            <div className="flex items-center gap-1.5">
              <DpeBadge dpe={dpeActuel} size="sm" />
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <DpeBadge dpe={dpeCible} size="sm" />
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: 'Scénario bas', value: calc.coutBas, color: 'text-emerald-400' },
              { label: 'Scénario moyen', value: calc.coutMoyen, color: 'text-white', bold: true },
              { label: 'Scénario haut', value: calc.coutHaut, color: 'text-amber-400' },
            ].map((row) => (
              <div key={row.label} className={`flex items-center justify-between px-3 py-2 rounded-lg ${row.bold ? 'bg-white/[0.04] border border-white/[0.06]' : ''}`}>
                <span className={`text-xs ${row.bold ? 'font-semibold text-zinc-300' : 'text-zinc-500'}`}>{row.label}</span>
                <span className={`text-sm font-bold tabular-nums ${row.color}`}>{formatCurrency(row.value)}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-white/[0.05]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">Saut DPE</span>
              <span className="text-[11px] font-bold text-white">{calc.sautClasses} classe{calc.sautClasses > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* ── Aides disponibles ────────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Aides de l'État</p>

          <div className="space-y-2">
            {/* MaPrimeRénov' */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${calc.maprimerenovEligible ? 'bg-emerald-500/[0.05] border border-emerald-500/20' : 'opacity-40'}`}>
              <div>
                <p className="text-[11px] font-semibold text-zinc-300">MaPrimeRénov' bailleur</p>
                <p className="text-[9px] text-zinc-600">{calc.maprimerenovEligible ? `Profil ${profile.replace('-', ' ')} — ${Math.round(({'tres-modeste':30,'modeste':25,'intermediaire':20,'superieur':15})[profile])}%` : 'Nécessite 2+ classes de saut'}</p>
              </div>
              <span className={`text-sm font-bold tabular-nums ${calc.maprimerenovEligible ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {calc.maprimerenovEligible ? `−${formatCurrency(calc.maprimerenovMontant)}` : '—'}
              </span>
            </div>

            {/* CEE */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${calc.ceeMontant > 0 ? 'bg-blue-500/[0.05] border border-blue-500/20' : 'opacity-40'}`}>
              <div>
                <p className="text-[11px] font-semibold text-zinc-300">CEE (certificats énergie)</p>
                <p className="text-[9px] text-zinc-600">{calc.ceeMontant > 0 ? 'Estimation via artisans RGE' : 'Nécessite 2+ classes de saut'}</p>
              </div>
              <span className={`text-sm font-bold tabular-nums ${calc.ceeMontant > 0 ? 'text-blue-400' : 'text-zinc-600'}`}>
                {calc.ceeMontant > 0 ? `−${formatCurrency(calc.ceeMontant)}` : '—'}
              </span>
            </div>

            {/* TVA réduite */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-violet-500/[0.05] border border-violet-500/20">
              <div>
                <p className="text-[11px] font-semibold text-zinc-300">TVA réduite 5.5%</p>
                <p className="text-[9px] text-zinc-600">Au lieu de 20% sur main d'œuvre</p>
              </div>
              <span className="text-sm font-bold tabular-nums text-violet-400">−{formatCurrency(calc.tvaMontant)}</span>
            </div>

            {/* Eco-PTZ */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${calc.ecoPtzEligible ? 'bg-indigo-500/[0.05] border border-indigo-500/20' : 'opacity-40'}`}>
              <div>
                <p className="text-[11px] font-semibold text-zinc-300">Eco-PTZ à 0%</p>
                <p className="text-[9px] text-zinc-600">{calc.ecoPtzEligible ? 'Prêt séparé, ne pèse pas sur le taux d\'endettement' : 'Nécessite 2+ classes de saut'}</p>
              </div>
              <span className={`text-sm font-bold tabular-nums ${calc.ecoPtzEligible ? 'text-indigo-400' : 'text-zinc-600'}`}>
                {calc.ecoPtzEligible ? `${formatCurrency(calc.ecoPtzMontant)}` : '—'}
              </span>
            </div>
          </div>

          {/* Total net */}
          <div className="pt-2 border-t border-white/[0.05] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">Total aides (subventions)</span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">−{formatCurrency(calc.totalAides)}</span>
            </div>
            <div className="flex items-center justify-between bg-white/[0.04] border border-white/[0.07] px-3 py-2 rounded-lg">
              <span className="text-xs font-semibold text-zinc-300">Coût net après aides</span>
              <span className="text-base font-black text-white tabular-nums">{formatCurrency(calc.coutNet)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Décote + Rentabilité avant/après ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Décote achat */}
        {calc.decotePct > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
            <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-3">Décote à l'achat</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Décote marché</span>
                <span className="font-bold text-amber-400">{Math.round(calc.decotePct * 100)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Économie</span>
                <span className="font-bold text-amber-400">{formatCurrency(calc.decoteMontant)}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-white/[0.05] pt-2">
                <span className="text-zinc-400 font-medium">Prix négocié</span>
                <span className="font-bold text-white">{formatCurrency(calc.prixAvecDecote)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Rendement avant/après */}
        <div className={`rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 ${calc.decotePct > 0 ? 'sm:col-span-2' : 'sm:col-span-3'}`}>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Rentabilité avant / après rénovation</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center rounded-lg bg-white/[0.03] border border-white/[0.05] p-3">
              <p className="text-[9px] text-zinc-600 mb-1">Rendement brut actuel</p>
              <p className="text-xl font-black text-zinc-400 tabular-nums" style={{ letterSpacing: '-0.04em' }}>
                {calc.rendBrutAvant.toFixed(1)}%
              </p>
              <p className="text-[9px] text-zinc-600 mt-0.5">{formatCurrency(loyerMensuel)}/mois</p>
            </div>
            <div className="text-center rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 p-3">
              <p className="text-[9px] text-zinc-500 mb-1">Rendement brut après rénov.</p>
              <p className="text-xl font-black text-emerald-400 tabular-nums" style={{ letterSpacing: '-0.04em' }}>
                {calc.rendBrutApres.toFixed(1)}%
              </p>
              <p className="text-[9px] text-zinc-500 mt-0.5">{formatCurrency(calc.loyerApresRenovation)}/mois</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── LMNP amortissement ────────────────────────────────────────────────── */}
      {isLmnp && calc.amortissementAnnuel > 0 && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4">
          <p className="text-[10px] font-bold text-violet-400/80 uppercase tracking-widest mb-3">Amortissement LMNP des travaux</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[9px] text-zinc-600 mb-1">Amort. annuel</p>
              <p className="text-base font-black text-white tabular-nums">{formatCurrency(calc.amortissementAnnuel)}</p>
              <p className="text-[9px] text-zinc-600 mt-0.5">sur 10 ans</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-zinc-600 mb-1">Économie impôt/an</p>
              <p className="text-base font-black text-violet-400 tabular-nums">{formatCurrency(calc.economieImpotAnnuelle)}</p>
              <p className="text-[9px] text-zinc-600 mt-0.5">TMI {params.tmi}% + PS 17.2%</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-zinc-600 mb-1">Recoupement</p>
              <p className="text-base font-black text-emerald-400 tabular-nums">{calc.recoupementAns} ans</p>
              <p className="text-[9px] text-zinc-600 mt-0.5">via économie fiscale</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Dossier bancaire ─────────────────────────────────────────────────── */}
      {calc.ltvAvant > 0 && (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Impact dossier bancaire</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center rounded-lg bg-white/[0.03] border border-white/[0.05] p-3">
              <p className="text-[9px] text-zinc-600 mb-1">LTV avant</p>
              <p className={`text-lg font-black tabular-nums ${calc.ltvAvant > 80 ? 'text-amber-400' : 'text-white'}`}>{calc.ltvAvant}%</p>
            </div>
            <div className="text-center rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20 p-3">
              <p className="text-[9px] text-zinc-500 mb-1">LTV après rénov.</p>
              <p className={`text-lg font-black tabular-nums ${calc.ltvApres > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>{calc.ltvApres}%</p>
            </div>
            <div className="sm:col-span-2 rounded-lg bg-white/[0.03] border border-white/[0.05] p-3">
              <p className="text-[9px] text-zinc-600 mb-1.5">Points forts pour la banque</p>
              <div className="space-y-1">
                {calc.ecoPtzEligible && (
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span>✓</span> Eco-PTZ à 0% — ne pèse pas sur l'endettement
                  </p>
                )}
                {calc.ltvApres < calc.ltvAvant && (
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span>✓</span> LTV améliorée ({calc.ltvAvant}% → {calc.ltvApres}%)
                  </p>
                )}
                {calc.decotePct > 0 && (
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span>✓</span> Décote achat {Math.round(calc.decotePct * 100)}% = marge de sécurité
                  </p>
                )}
                {calc.maprimerenovEligible && (
                  <p className="text-[10px] text-blue-400 flex items-center gap-1">
                    <span>→</span> MaPrimeRénov' à présenter comme apport travaux
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bouton appliquer scénario ─────────────────────────────────────────── */}
      {onApplyScenario && (
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => onApplyScenario(calc.coutNet, calc.prixAvecDecote > 0 ? calc.prixAvecDecote : params.prixAchat)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[13px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Appliquer ce scénario au calculateur
          </button>
          <p className="text-[10px] text-zinc-600">
            Recalcule avec travaux {formatCurrency(calc.coutNet)} et prix {formatCurrency(calc.prixAvecDecote > 0 ? calc.prixAvecDecote : params.prixAchat)}
          </p>
        </div>
      )}
    </div>
  )
}
