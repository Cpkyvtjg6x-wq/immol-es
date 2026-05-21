'use client'

import { useState, useMemo } from 'react'
import {
  calculateRenovation,
  DpeClass, ProfileRevenu, FinancementTravaux,
  DPE_ORDER, dpeIndex, RenovationResult,
} from '@/lib/renovation'
import { InvestmentParams, InvestmentResult } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

// ─── Helpers visuels ──────────────────────────────────────────────────────────

const DPE_COLORS: Record<DpeClass, { bg: string; text: string; label: string }> = {
  A: { bg: '#00a550', text: '#fff', label: 'A — Très performant' },
  B: { bg: '#57b947', text: '#fff', label: 'B — Performant' },
  C: { bg: '#c8d400', text: '#222', label: 'C — Assez performant' },
  D: { bg: '#ffd400', text: '#222', label: 'D — Peu performant' },
  E: { bg: '#f7a600', text: '#222', label: 'E — Énergivore' },
  F: { bg: '#e3630a', text: '#fff', label: 'F — Très énergivore' },
  G: { bg: '#cc0000', text: '#fff', label: 'G — Extrêmement énergivore' },
}

function DpeBadge({ dpe, size = 'md' }: { dpe: DpeClass; size?: 'sm' | 'md' | 'lg' }) {
  const c = DPE_COLORS[dpe]
  const sz = size === 'sm' ? 'w-7 h-7 text-sm' : size === 'lg' ? 'w-12 h-12 text-2xl' : 'w-9 h-9 text-base'
  return (
    <div
      className={`${sz} rounded font-black flex items-center justify-center shrink-0`}
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {dpe}
    </div>
  )
}

function DpeArrow({ from, to }: { from: DpeClass; to: DpeClass }) {
  return (
    <div className="flex items-center gap-2">
      <DpeBadge dpe={from} size="md" />
      <div className="flex flex-col items-center">
        <svg className="w-6 h-3 text-emerald-400" fill="none" viewBox="0 0 24 12">
          <path d="M0 6h20M16 1l6 5-6 5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-[9px] text-zinc-500 mt-0.5">rénovation</span>
      </div>
      <DpeBadge dpe={to} size="md" />
    </div>
  )
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-5 h-5 text-blue-400 shrink-0">{icon}</div>
      <p className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest">{children}</p>
    </div>
  )
}

function InfoRow({ label, value, highlight, sub }: {
  label: string; value: string; highlight?: boolean; sub?: string
}) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[12px] text-zinc-500 leading-tight">{label}</span>
      <div className="text-right">
        <span className={`text-[12px] font-bold tabular-nums ${highlight ? 'text-emerald-400' : 'text-zinc-200'}`}>
          {value}
        </span>
        {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function AideRow({ label, montant, note, eligible }: {
  label: string; montant: number; note: string; eligible?: boolean
}) {
  const val = montant > 0 ? formatCurrency(montant) : 'Non éligible'
  const color = montant > 0 ? 'text-emerald-400' : 'text-zinc-600'
  return (
    <div className="py-2 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-[12px] text-zinc-300 font-medium">{label}</span>
        <span className={`text-[12px] font-bold tabular-nums shrink-0 ${color}`}>{val}</span>
      </div>
      <p className="text-[10px] text-zinc-600 leading-relaxed">{note}</p>
    </div>
  )
}

function BeforeAfterKpi({ label, before, after, unit = '', invert = false }: {
  label: string; before: number; after: number; unit?: string; invert?: boolean
}) {
  const delta = after - before
  const positive = invert ? delta < 0 : delta > 0
  const sign = delta > 0 ? '+' : ''
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-end gap-3">
        <div>
          <p className="text-[10px] text-zinc-600 mb-0.5">Avant</p>
          <p className="text-[15px] font-bold text-zinc-400 tabular-nums">
            {unit === '€' ? formatCurrency(before) : `${before.toFixed(1)}${unit}`}
          </p>
        </div>
        <div className="pb-0.5">
          <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </div>
        <div>
          <p className="text-[10px] text-zinc-600 mb-0.5">Après</p>
          <p className={`text-[15px] font-bold tabular-nums ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {unit === '€' ? formatCurrency(after) : `${after.toFixed(1)}${unit}`}
          </p>
        </div>
        {delta !== 0 && (
          <div className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
            positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {sign}{unit === '€' ? formatCurrency(delta) : `${delta.toFixed(1)}${unit}`}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Labels profil revenu ─────────────────────────────────────────────────────
const PROFILE_LABELS: Record<ProfileRevenu, string> = {
  'tres-modeste':  'Très modeste (< 22 k€/an)',
  'modeste':       'Modeste (22–30 k€/an)',
  'intermediaire': 'Intermédiaire (30–45 k€/an)',
  'superieur':     'Supérieur (> 45 k€/an)',
}

const FINANCEMENT_LABELS: Record<FinancementTravaux, string> = {
  'credit-principal': 'Intégré au crédit principal',
  'eco-ptz':          'Eco-PTZ séparé (0%)',
  'fonds-propres':    'Fonds propres',
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  params: InvestmentParams
  result: InvestmentResult
  onApplyScenario?: (travaux: number, prixAchat: number) => void
}

export function DpeRenovationPanel({ params, result, onApplyScenario }: Props) {
  const dpeActuel = (params.dpe || 'D') as DpeClass

  // Cibles disponibles (meilleures que l'actuel)
  const ciblesDisponibles = DPE_ORDER.filter(d => dpeIndex(d) > dpeIndex(dpeActuel)) as DpeClass[]
  const defaultCible: DpeClass = ciblesDisponibles[Math.min(1, ciblesDisponibles.length - 1)] ?? 'C'

  const [dpeCible, setDpeCible]               = useState<DpeClass>(defaultCible)
  const [profileRevenu, setProfileRevenu]     = useState<ProfileRevenu>('intermediaire')
  const [financement, setFinancement]         = useState<FinancementTravaux>('eco-ptz')
  const [budgetCustom, setBudgetCustom]       = useState<string>('')
  const [scenarioApplied, setScenarioApplied] = useState(false)

  const reno = useMemo((): RenovationResult => calculateRenovation({
    dpeActuel,
    dpeCible,
    surface:            params.surface,
    prixAchat:          params.prixAchat,
    loyerActuel:        result.loyer,
    mensualiteCredit:   result.mensualiteCredit,
    montantEmprunte:    result.montantEmprunte,
    profileRevenu,
    financementTravaux: financement,
    budgetCustom:       budgetCustom ? parseInt(budgetCustom, 10) : undefined,
    apportDisponible:   params.apport,
    tmi:                params.tmi,
    locType:            params.locType,
  }), [dpeActuel, dpeCible, profileRevenu, financement, budgetCustom, params, result])

  const urgenceColors = {
    critique: 'bg-red-500/10 border-red-500/30 text-red-400',
    attention: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    neutre: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  }

  const recoColors = {
    excellent:     'text-emerald-400',
    rentable:      'text-emerald-400',
    attention:     'text-amber-400',
    deconseille:   'text-red-400',
  }

  const recoIcons = {
    excellent:   '✦',
    rentable:    '✔',
    attention:   '⚠',
    deconseille: '✗',
  }

  // Si pas de cibles disponibles (DPE déjà A ou B)
  if (ciblesDisponibles.length === 0) {
    return (
      <div className="p-6 text-center">
        <DpeBadge dpe={dpeActuel} size="lg" />
        <p className="text-zinc-400 mt-4 text-sm">
          Ce bien est déjà classé <strong>{dpeActuel}</strong> — aucune amélioration DPE significative à simuler.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Bandeau urgence ─────────────────────────────────────────────────── */}
      {reno.urgence !== 'neutre' && (
        <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${urgenceColors[reno.urgence]}`}>
          <span className="text-lg shrink-0 mt-0.5">{reno.urgence === 'critique' ? '🚫' : '⚠️'}</span>
          <div>
            <p className="text-[12px] font-bold mb-0.5">
              {reno.urgence === 'critique'
                ? `DPE ${dpeActuel} — Bien interdit à la location depuis janvier 2025`
                : `DPE ${dpeActuel} — Interdiction de location le ${reno.dateInterdictionLocation}`}
            </p>
            <p className="text-[11px] opacity-80 leading-relaxed">
              {reno.urgence === 'critique'
                ? 'Ce bien ne peut légalement pas être mis en location. Vous devez rénover avant de le proposer à la location. La forte décote possible à l\'achat peut rendre cette opération très intéressante.'
                : `Vous avez jusqu'au ${reno.dateInterdictionLocation} pour rénover ou reloger. Simulez l'opération ci-dessous pour voir si c'est rentable.`}
            </p>
          </div>
        </div>
      )}

      {/* ── Configuration ───────────────────────────────────────────────────── */}
      <div className="bg-white/[0.025] rounded-xl border border-white/[0.06] p-4 space-y-4">
        <SectionTitle icon={
          <svg fill="none" viewBox="0 0 20 20" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.5 3.5l5 5M3 13l3 3 8-8-3-3-8 8zm9.5-9.5l1.5-1.5a2.121 2.121 0 013 3L15.5 7"/>
          </svg>
        }>
          Paramètres de la rénovation
        </SectionTitle>

        {/* DPE actuel + cible */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">DPE actuel</label>
            <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.06]">
              <DpeBadge dpe={dpeActuel} size="sm" />
              <span className="text-[12px] text-zinc-300 font-medium">{DPE_COLORS[dpeActuel].label.split(' — ')[1]}</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Objectif DPE cible</label>
            <div className="relative">
              <select
                value={dpeCible}
                onChange={e => { setDpeCible(e.target.value as DpeClass); setScenarioApplied(false) }}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-zinc-200 appearance-none focus:outline-none focus:border-blue-500/50"
              >
                {ciblesDisponibles.map(d => (
                  <option key={d} value={d} className="bg-zinc-900">
                    {d} — {DPE_COLORS[d].label.split(' — ')[1]}
                  </option>
                ))}
              </select>
              <svg className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Profil revenus + financement */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Profil revenus (aides)</label>
            <select
              value={profileRevenu}
              onChange={e => setProfileRevenu(e.target.value as ProfileRevenu)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-zinc-200 appearance-none focus:outline-none focus:border-blue-500/50"
            >
              {(Object.entries(PROFILE_LABELS) as [ProfileRevenu, string][]).map(([k, v]) => (
                <option key={k} value={k} className="bg-zinc-900">{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Financement travaux</label>
            <select
              value={financement}
              onChange={e => setFinancement(e.target.value as FinancementTravaux)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-zinc-200 appearance-none focus:outline-none focus:border-blue-500/50"
            >
              {(Object.entries(FINANCEMENT_LABELS) as [FinancementTravaux, string][]).map(([k, v]) => (
                <option key={k} value={k} className="bg-zinc-900">{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Budget personnalisé */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">
            Budget travaux personnalisé <span className="text-zinc-600">(laisser vide pour estimation auto)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={budgetCustom}
              onChange={e => { setBudgetCustom(e.target.value); setScenarioApplied(false) }}
              placeholder={`Estimation auto : ${reno.budgetMid.toLocaleString('fr-FR')} €`}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-zinc-200 focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-700"
            />
            <span className="absolute right-3 top-2 text-[12px] text-zinc-600">€</span>
          </div>
        </div>
      </div>

      {/* ── Budget & estimation ──────────────────────────────────────────────── */}
      <div className="bg-white/[0.025] rounded-xl border border-white/[0.06] p-4">
        <SectionTitle icon={
          <svg fill="none" viewBox="0 0 20 20" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h14M3 6h14M3 14h7"/>
          </svg>
        }>
          Estimation travaux — <span className="text-zinc-400 font-normal capitalize">{params.surface} m²</span>
        </SectionTitle>

        {/* Fourchette budget */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Minimal', val: reno.budgetLow, color: 'text-zinc-300' },
            { label: 'Estimé', val: reno.budgetMid, color: 'text-blue-400', highlight: true },
            { label: 'Confort', val: reno.budgetHigh, color: 'text-zinc-400' },
          ].map(b => (
            <div key={b.label} className={`rounded-lg p-2.5 text-center ${b.highlight ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-white/[0.03] border border-white/[0.05]'}`}>
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">{b.label}</p>
              <p className={`text-[14px] font-bold tabular-nums ${b.color}`}>{formatCurrency(b.val)}</p>
            </div>
          ))}
        </div>

        {/* Postes de travaux */}
        {reno.postes.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Postes typiques pour {dpeActuel} → {dpeCible}</p>
            {reno.postes.map((poste, i) => (
              <div key={i} className={`flex items-start gap-2.5 py-1.5 px-2.5 rounded-lg ${poste.applicable ? 'bg-white/[0.03]' : 'opacity-50'}`}>
                <span className={`mt-0.5 text-[11px] shrink-0 ${poste.applicable ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {poste.applicable ? '✓' : '◦'}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-zinc-300 font-medium">{poste.label}</p>
                  <p className="text-[10px] text-zinc-600">{poste.description}</p>
                </div>
                <div className="ml-auto text-right shrink-0">
                  <p className="text-[11px] text-zinc-400 tabular-nums font-medium">
                    {formatCurrency(poste.coutEstime[0])} – {formatCurrency(poste.coutEstime[2])}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Aides de l'État ─────────────────────────────────────────────────── */}
      <div className="bg-white/[0.025] rounded-xl border border-white/[0.06] p-4">
        <SectionTitle icon={
          <svg fill="none" viewBox="0 0 20 20" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        }>
          Aides de l'État disponibles
        </SectionTitle>

        <div className="space-y-0.5">
          <AideRow
            label="MaPrimeRénov' (MPR)"
            montant={reno.aides.maprimerenovMontant}
            note={reno.aides.maprimerenovNote}
          />
          <AideRow
            label="TVA réduite 5,5 %"
            montant={reno.aides.tvaReduiteMontant}
            note="Économie TVA 5,5% vs 20% sur travaux de rénovation énergétique"
          />
          <AideRow
            label="Certificats d'Économies d'Énergie (CEE)"
            montant={reno.aides.ceeMontant}
            note="Prime versée par les fournisseurs d'énergie — montant estimatif"
          />
          {reno.aides.anah > 0 && (
            <AideRow
              label="Aide ANAH (bailleur modeste)"
              montant={reno.aides.anah}
              note="Aide ANAH pour bailleurs à revenus très modestes — Loc'Avantages"
            />
          )}
        </div>

        {/* Eco-PTZ (financement séparé) */}
        <div className={`mt-3 rounded-lg p-3 border ${reno.aides.ecoPtzEligible ? 'bg-blue-500/[0.06] border-blue-500/20' : 'bg-white/[0.02] border-white/[0.05]'}`}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[12px] font-medium text-zinc-300">Eco-PTZ (prêt à 0%)</p>
            <span className={`text-[12px] font-bold tabular-nums ${reno.aides.ecoPtzEligible ? 'text-blue-400' : 'text-zinc-600'}`}>
              {reno.aides.ecoPtzEligible ? `jusqu'à ${formatCurrency(reno.aides.ecoPtzMontant)}` : 'Non éligible'}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600 leading-relaxed">{reno.aides.ecoPtzNote}</p>
          {reno.aides.ecoPtzEligible && (
            <p className="text-[10px] text-blue-500/70 mt-1">
              ℹ Ce prêt est <strong>distinct du crédit principal</strong> — il n'impacte pas (ou peu) votre taux d'endettement.
            </p>
          )}
        </div>

        {/* Récap net */}
        <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Total aides cumulées</p>
            <p className="text-[18px] font-black text-emerald-400 tabular-nums">{formatCurrency(reno.aides.totalAides)}</p>
            <p className="text-[9px] text-zinc-600">(hors Eco-PTZ)</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Net à votre charge</p>
            <p className="text-[18px] font-black text-zinc-200 tabular-nums">{formatCurrency(reno.aides.netACharge)}</p>
            <p className="text-[9px] text-zinc-600">budget retenu − aides</p>
          </div>
        </div>
      </div>

      {/* ── Décote d'achat ──────────────────────────────────────────────────── */}
      {reno.decotePct > 0 && (
        <div className="bg-white/[0.025] rounded-xl border border-white/[0.06] p-4">
          <SectionTitle icon={
            <svg fill="none" viewBox="0 0 20 20" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5l6 6-6 6H7l-6-6 6-6z"/>
            </svg>
          }>
            Décote d'achat liée au DPE
          </SectionTitle>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center bg-white/[0.03] rounded-lg p-2.5">
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Prix affiché</p>
              <p className="text-[13px] font-bold text-zinc-400 tabular-nums">{formatCurrency(params.prixAchat)}</p>
            </div>
            <div className="text-center bg-amber-500/[0.08] rounded-lg p-2.5 border border-amber-500/20">
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Décote estimée</p>
              <p className="text-[13px] font-bold text-amber-400 tabular-nums">−{formatCurrency(reno.decoteMontant)}</p>
              <p className="text-[9px] text-zinc-600">({Math.round(reno.decotePct * 100)}%)</p>
            </div>
            <div className="text-center bg-emerald-500/[0.08] rounded-lg p-2.5 border border-emerald-500/20">
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Prix négocié cible</p>
              <p className="text-[13px] font-bold text-emerald-400 tabular-nums">{formatCurrency(reno.prixAchatAvecDecote)}</p>
            </div>
          </div>

          <p className="text-[10px] text-zinc-600 leading-relaxed">
            Un DPE {dpeActuel} justifie en moyenne une décote de {Math.round(reno.decotePct * 100)}% par rapport à un bien équivalent classé C ou D. Cette décote est un argument de négociation légitime que vous pouvez formaliser lors d'une offre d'achat.
          </p>
        </div>
      )}

      {/* ── Avant / Après rentabilité ────────────────────────────────────────── */}
      <div className="bg-white/[0.025] rounded-xl border border-white/[0.06] p-4">
        <SectionTitle icon={
          <svg fill="none" viewBox="0 0 20 20" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        }>
          Impact sur la rentabilité
        </SectionTitle>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <BeforeAfterKpi
            label="Rendement brut"
            before={reno.rendBrutAvant}
            after={reno.rendBrutApres}
            unit="%"
          />
          <BeforeAfterKpi
            label="Loyer mensuel"
            before={result.loyer}
            after={reno.loyerApresRenovation}
            unit="€"
          />
        </div>

        {/* LMNP amortissement travaux */}
        {params.locType !== 'nu' && reno.amortissementTravauxAnnuel > 0 && (
          <div className="mt-3 bg-blue-500/[0.06] rounded-lg p-3 border border-blue-500/15">
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-2">
              Amortissement LMNP des travaux (régime réel)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <InfoRow label={`Amort. / an (${reno.dureeAmortissement} ans)`} value={formatCurrency(reno.amortissementTravauxAnnuel)} />
              <InfoRow label="Économie impôt / an" value={formatCurrency(reno.economieImpotAnnuelle)} highlight />
              <InfoRow label="Récupération fiscale" value={`${reno.recoupementFiscal} ans`} />
            </div>
            <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed">
              En LMNP réel, les travaux sont amortis sur {reno.dureeAmortissement} ans, générant {formatCurrency(reno.amortissementTravauxAnnuel)}/an de charges déductibles. Au TMI {params.tmi}%, cela représente {formatCurrency(reno.economieImpotAnnuelle)} d'impôt économisé chaque année.
            </p>
          </div>
        )}
      </div>

      {/* ── Impact dossier bancaire ──────────────────────────────────────────── */}
      <div className="bg-white/[0.025] rounded-xl border border-white/[0.06] p-4">
        <SectionTitle icon={
          <svg fill="none" viewBox="0 0 20 20" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z"/>
          </svg>
        }>
          Impact dossier bancaire
        </SectionTitle>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <BeforeAfterKpi
            label="Valeur du bien"
            before={params.prixAchat}
            after={reno.bancaire.valeurPostRenovation}
            unit="€"
          />
          <BeforeAfterKpi
            label="LTV (crédit / valeur)"
            before={reno.bancaire.ltvAvant}
            after={reno.bancaire.ltvApres}
            unit="%"
            invert
          />
        </div>

        {/* Points forts */}
        {reno.bancaire.pointsForts.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {reno.bancaire.pointsForts.map((pt, i) => (
              <div key={i} className="flex items-center gap-2 py-1 px-2.5 bg-emerald-500/[0.06] rounded-lg border border-emerald-500/10">
                <span className="text-emerald-400 text-[11px] shrink-0">✓</span>
                <span className="text-[11px] text-zinc-300">{pt}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recommandation banquier */}
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Argument bancaire</p>
          <p className="text-[11px] text-zinc-300 leading-relaxed">{reno.bancaire.recommandationBanquier}</p>
        </div>

        {/* Taux couverture */}
        {reno.bancaire.tauxCouvertureApres > 0 && (
          <div className="mt-3 flex items-center justify-between px-3 py-2 bg-white/[0.03] rounded-lg border border-white/[0.05]">
            <span className="text-[11px] text-zinc-500">Taux de couverture locatif post-rénov (loyer × 70% / mensualité)</span>
            <span className={`text-[13px] font-bold tabular-nums ml-3 shrink-0 ${
              reno.bancaire.tauxCouvertureApres >= 110 ? 'text-emerald-400' :
              reno.bancaire.tauxCouvertureApres >= 90 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {reno.bancaire.tauxCouvertureApres}%
            </span>
          </div>
        )}
      </div>

      {/* ── Recommandation globale ───────────────────────────────────────────── */}
      <div className={`rounded-xl border p-4 ${
        reno.recommandation === 'excellent' || reno.recommandation === 'rentable'
          ? 'bg-emerald-500/[0.06] border-emerald-500/20'
          : reno.recommandation === 'attention'
          ? 'bg-amber-500/[0.06] border-amber-500/20'
          : 'bg-red-500/[0.06] border-red-500/20'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-lg ${recoColors[reno.recommandation]}`}>
            {recoIcons[reno.recommandation]}
          </span>
          <p className={`text-[12px] font-bold uppercase tracking-wide ${recoColors[reno.recommandation]}`}>
            {reno.recommandation === 'excellent' ? 'Opération très intéressante'
             : reno.recommandation === 'rentable' ? 'Opération rentable'
             : reno.recommandation === 'attention' ? 'À valider au cas par cas'
             : 'Déconseillé en l\'état'}
          </p>
        </div>
        <p className="text-[12px] text-zinc-300 leading-relaxed">{reno.recommandationTexte}</p>
      </div>

      {/* ── Bouton appliquer ────────────────────────────────────────────────── */}
      {onApplyScenario && (
        <button
          onClick={() => {
            onApplyScenario(reno.aides.netACharge, reno.prixAchatAvecDecote)
            setScenarioApplied(true)
          }}
          className={`w-full py-3 rounded-xl font-bold text-[13px] transition-all border ${
            scenarioApplied
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
          }`}
        >
          {scenarioApplied
            ? '✓ Scénario appliqué au calculateur principal'
            : `Appliquer ce scénario — prix ${formatCurrency(reno.prixAchatAvecDecote)} + ${formatCurrency(reno.aides.netACharge)} travaux`}
        </button>
      )}
    </div>
  )
}
