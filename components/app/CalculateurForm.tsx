'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { InvestmentParams, InvestmentResult } from '@/lib/types'
import { DEFAULT_PARAMS, calculerFraisNotaire } from '@/lib/calculator'
import { calculateFiscal } from '@/lib/fiscal'
import { VILLES } from '@/lib/market-data'
import { calculateRenovation, DpeClass, ProfileRevenu, DPE_COLORS, DPE_LABELS, DPE_INTERDICTION } from '@/lib/renovation'
import { formatCurrency } from '@/lib/utils'

interface Props {
  onCalculate: (params: InvestmentParams) => Promise<void>
  onChange?: (params: InvestmentParams) => void
  loading: boolean
  initialParams?: InvestmentParams
  result?: InvestmentResult | null
}

// ─── UI primitives ─────────────────────────────────────────────────────────────

function SectionHeader({
  num,
  title,
  open,
  onToggle,
  badge,
}: {
  num: string
  title: string
  open: boolean
  onToggle: () => void
  badge?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 py-3.5 px-5 text-left hover:bg-white/[0.02] transition-colors"
    >
      <span className="w-5 h-5 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">
        {num}
      </span>
      <span className="flex-1 text-[13px] font-semibold text-white">{title}</span>
      {badge && (
        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <svg
        className={`w-3.5 h-3.5 text-zinc-600 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{children}</p>
  )
}

function NumInput({
  value, onChange, suffix, placeholder, min = 0, step = 1, readOnly,
}: {
  value: number; onChange?: (v: number) => void; suffix?: string
  placeholder?: string; min?: number; step?: number; readOnly?: boolean
}) {
  return (
    <div className="relative flex items-center">
      <input
        type="number"
        value={value || ''}
        readOnly={readOnly}
        onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
        min={min}
        step={step}
        placeholder={placeholder ?? '0'}
        className={`w-full bg-white/[0.04] border border-white/[0.07] rounded-lg text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/40 transition-all pl-3 ${suffix ? 'pr-9' : 'pr-3'} py-2 tabular-nums appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${readOnly ? 'opacity-50 cursor-default' : ''}`}
      />
      {suffix && (
        <span className="absolute right-3 text-[11px] text-zinc-500 pointer-events-none">{suffix}</span>
      )}
    </div>
  )
}

function BtnGroup({
  options, value, onChange, cols,
}: {
  options: { value: string; label: string; color?: string }[]
  value: string
  onChange: (v: string) => void
  cols?: number
}) {
  return (
    <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${cols ?? options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`py-2 px-1.5 text-[11px] font-semibold rounded-lg transition-all truncate ${
            value === o.value
              ? o.color === 'amber'
                ? 'bg-amber-500 text-zinc-950'
                : 'bg-emerald-500 text-zinc-950'
              : 'bg-white/[0.04] border border-white/[0.07] text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.08]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SliderRow({
  label, value, onChange, min, max, step = 0.5, suffix, hint,
}: {
  label: string; value: number; onChange: (v: number) => void
  min: number; max: number; step?: number; suffix?: string; hint?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label>{label}</Label>
        <span className="text-[12px] font-bold text-white tabular-nums">{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-emerald-500 cursor-pointer h-1.5"
      />
      <div className="flex justify-between text-[10px] text-zinc-700 mt-1">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
      {hint && <p className="text-[10px] text-zinc-600 mt-1">{hint}</p>}
    </div>
  )
}

function ToggleRow({
  label, value, onChange, hint, disabled,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void; hint?: string; disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className={`text-[13px] font-medium ${disabled ? 'text-zinc-600' : 'text-zinc-300'}`}>{label}</p>
        {hint && <p className="text-[10px] text-zinc-600 mt-0.5 leading-snug">{hint}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!value)}
        className={`w-9 h-5 rounded-full transition-all shrink-0 relative mt-0.5 ${
          value && !disabled ? 'bg-emerald-500' : 'bg-white/[0.1]'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value && !disabled ? 'left-4' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function Row3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-2.5">{children}</div>
}

function Divider() {
  return <div className="border-t border-white/[0.04] my-1" />
}

// ─── Main form ─────────────────────────────────────────────────────────────────

export function CalculateurForm({ onCalculate, onChange, loading, initialParams, result }: Props) {
  const [p, setP] = useState<InvestmentParams>(initialParams ?? DEFAULT_PARAMS)
  const [openSections, setOpenSections] = useState({
    bien: true,
    travaux: true,
    financement: true,
    location: true,
    charges: true,
    fiscalite: true,
    revente: false,
  })

  // ─── État section Travaux ──────────────────────────────────────────────────
  const [travauxEsthetiques, setTravauxEsthetiques] = useState(0)
  const [renoDpeEnabled, setRenoDpeEnabled] = useState(false)
  const [renoDpeCible, setRenoDpeCible] = useState<DpeClass>('C')
  const [renoProfile, setRenoProfile] = useState<ProfileRevenu>('intermediaire')
  const [renoBudgetInput, setRenoBudgetInput] = useState('')
  const [renoBudgetCustom, setRenoBudgetCustom] = useState<number | undefined>(undefined)
  // Mémorise le prixAchat appliqué — bouton décote désactivé tant qu'il n'a pas changé
  const [renoApplied, setRenoApplied] = useState<{ prixAchat: number } | null>(null)
  const [showPtz, setShowPtz] = useState(false)
  const [showFinancementAvance, setShowFinancementAvance] = useState(false)

  // ─── Calcul rénovation DPE (utilisé pour auto-sync travaux) ───────────────
  const renoCalc = useMemo(() => {
    if (!renoDpeEnabled) return null
    const dpeActuel = p.dpe as DpeClass
    const ordre: DpeClass[] = ['G','F','E','D','C','B','A']
    const idxActuel = ordre.indexOf(dpeActuel)
    const cibles = ordre.slice(idxActuel + 1)
    if (cibles.length === 0) return null
    const dpeCibleValide = cibles.includes(renoDpeCible) ? renoDpeCible : cibles[0]
    const loyerMensuel =
      p.locType === 'meuble' || p.locType === 'saisonnier' ? p.loyerMeuble :
      p.locType === 'coloc' ? p.loyerParChambre * p.nbChambres :
      p.loyerNu
    return calculateRenovation(
      dpeActuel, dpeCibleValide, p.surface, p.prixAchat, loyerMensuel,
      result?.montantEmprunte ?? 0, p.tmi, renoProfile, p.locType, renoBudgetCustom,
    )
  }, [renoDpeEnabled, p.dpe, renoDpeCible, p.surface, p.prixAchat, p.locType,
      p.loyerMeuble, p.loyerNu, p.loyerParChambre, p.nbChambres, p.tmi,
      renoProfile, renoBudgetCustom, result?.montantEmprunte])

  // ─── Auto-sync p.travaux = esthétiques + coût net DPE ─────────────────────
  useEffect(() => {
    const dpeNet = (renoDpeEnabled && renoCalc) ? renoCalc.coutNet : 0
    const total = travauxEsthetiques + dpeNet
    setP((prev) => {
      if (prev.travaux === total) return prev
      return { ...prev, travaux: total }
    })
  }, [travauxEsthetiques, renoDpeEnabled, renoCalc])

  // ─── Auto-calcul frais notaire ─────────────────────────────────────────────
  useEffect(() => {
    if (p.fraisNotaireAuto) {
      const auto = calculerFraisNotaire(p.prixAchat, p.etat)
      setP((prev) => ({ ...prev, fraisNotaire: auto }))
    }
  }, [p.prixAchat, p.etat, p.fraisNotaireAuto])

  // Notify parent on every param change (for live calculation)
  useEffect(() => {
    onChange?.(p)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p])

  const set = useCallback(<K extends keyof InvestmentParams>(key: K, val: InvestmentParams[K]) => {
    setP((prev) => ({ ...prev, [key]: val }))
  }, [])

  const toggle = (section: keyof typeof openSections) =>
    setOpenSections((s) => ({ ...s, [section]: !s[section] }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCalculate(p)
  }

  const isMeuble = p.locType === 'meuble' || p.locType === 'saisonnier'

  // ─── Preview fiscal par structure (calculé en live si result disponible) ──────
  const structurePreviews = useMemo(() => {
    if (!result || result.prixRevient <= 0) return {}
    const structs = ['nom-propre', 'sci-ir', 'sci-is', 'sarl-famille'] as const
    const out: Record<string, { rendNetNet: number; bestName: string; cfNet: number }> = {}
    for (const s of structs) {
      try {
        const fr = calculateFiscal({
          tmi: p.tmi,
          prixAchat: p.prixAchat,
          travaux: p.travaux ?? 0,
          prixRevient: result.prixRevient,
          locType: p.locType,
          lmpEnabled: p.lmpEnabled,
          sciIS: s === 'sci-is',
          sarlFamille: s === 'sarl-famille',
          structure: s,
        }, result)
        const enabled = fr.regimes.filter(r => !r.disabled)
        if (enabled.length > 0) {
          const best = enabled.reduce((b, r) => r.rendNetNet > b.rendNetNet ? r : b, enabled[0])
          out[s] = { rendNetNet: best.rendNetNet, bestName: best.name, cfNet: best.cfNet }
        }
      } catch { /* ignore */ }
    }
    return out
  }, [result, p.tmi, p.prixAchat, p.travaux, p.locType, p.lmpEnabled])
  const isColoc = p.locType === 'coloc'
  const isNu = p.locType === 'nu'

  const cityList = Object.keys(VILLES || {})

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 1 — LE BIEN                                                 */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.05]">
          <SectionHeader num="1" title="Le bien" open={openSections.bien} onToggle={() => toggle('bien')} />
          {openSections.bien && (
            <div className="px-5 pb-5 space-y-4">

              {/* Type */}
              <div>
                <Label>Type de bien</Label>
                <BtnGroup
                  cols={3}
                  value={p.typeBien ?? 'Appartement'}
                  onChange={(v) => set('typeBien', v)}
                  options={[
                    { value: 'Appartement', label: 'Appart.' },
                    { value: 'Maison', label: 'Maison' },
                    { value: 'Studio', label: 'Studio' },
                    { value: 'Immeuble', label: 'Immeuble' },
                    { value: 'Parking', label: 'Parking' },
                    { value: 'Commercial', label: 'Local' },
                  ]}
                />
              </div>

              {/* État */}
              <div>
                <Label>État du bien</Label>
                <BtnGroup
                  value={p.etat}
                  onChange={(v) => set('etat', v as 'ancien' | 'neuf')}
                  options={[
                    { value: 'ancien', label: '🏚 Ancien (~8% notaire)' },
                    { value: 'neuf', label: '🏗 Neuf (~3% notaire)' },
                  ]}
                />
              </div>

              {/* Prix + Surface */}
              <Row2>
                <div>
                  <Label>Prix d'achat</Label>
                  <NumInput value={p.prixAchat} onChange={(v) => set('prixAchat', v)} suffix="€" step={1000} />
                </div>
                <div>
                  <Label>Surface</Label>
                  <NumInput value={p.surface} onChange={(v) => set('surface', v)} suffix="m²" />
                </div>
              </Row2>

              {/* Prix m² */}
              {p.surface > 0 && p.prixAchat > 0 && (
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[11px] text-zinc-500">Prix au m²</span>
                  <span className="text-sm font-bold text-white tabular-nums">
                    {Math.round(p.prixAchat / p.surface).toLocaleString('fr-FR')} €/m²
                  </span>
                </div>
              )}

              {/* Frais notaire */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Frais de notaire</Label>
                  <button
                    type="button"
                    onClick={() => set('fraisNotaireAuto', !p.fraisNotaireAuto)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all ${
                      p.fraisNotaireAuto
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-white/[0.05] text-zinc-500 border border-white/[0.08]'
                    }`}
                  >
                    {p.fraisNotaireAuto ? '⚡ Auto' : '✏ Manuel'}
                  </button>
                </div>
                <NumInput
                  value={p.fraisNotaire}
                  onChange={(v) => { set('fraisNotaire', v); set('fraisNotaireAuto', false) }}
                  suffix="€"
                  step={100}
                  readOnly={p.fraisNotaireAuto}
                />
                {p.fraisNotaireAuto && (
                  <p className="text-[10px] text-zinc-600 mt-1">
                    Calculé automatiquement selon l&apos;état du bien
                  </p>
                )}
              </div>

              {/* Prix de revient */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] text-zinc-500">Prix de revient total</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {(p.prixAchat + p.fraisNotaire + p.travaux).toLocaleString('fr-FR')} €
                </span>
              </div>

              {/* DPE */}
              <div>
                <Label>Classe DPE</Label>
                <div className="flex gap-1.5">
                  {(['A','B','C','D','E','F','G'] as DpeClass[]).map((d) => {
                    const col = DPE_COLORS[d]
                    const selected = p.dpe === d
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => set('dpe', d)}
                        className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all"
                        style={{
                          color: col.bg,
                          backgroundColor: selected ? col.bg + '22' : 'transparent',
                          border: selected
                            ? `1.5px solid ${col.bg}55`
                            : `1.5px solid ${col.bg}22`,
                          opacity: selected ? 1 : 0.45,
                        }}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
                {['E','F', 'G'].includes(p.dpe) && (
                  <p className="text-[10px] text-amber-400/80 mt-1.5">
                    {p.dpe === 'G' ? 'Interdit à la location depuis jan. 2025' : p.dpe === 'F' ? 'Interdit à la location en 2028' : 'Interdit à la location en 2034'}
                  </p>
                )}
              </div>

              {/* Ville */}
              <div>
                <Label>Ville</Label>
                {cityList.length > 0 ? (
                  <select
                    value={p.ville}
                    onChange={(e) => set('ville', e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg text-sm text-white px-3 py-2 focus:outline-none focus:border-emerald-500/40 transition-all"
                  >
                    {cityList.map((c) => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={p.ville}
                    onChange={(e) => set('ville', e.target.value)}
                    placeholder="Paris, Lyon, Bordeaux…"
                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg text-sm text-white px-3 py-2 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/40"
                  />
                )}
              </div>

            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 2 — TRAVAUX                                                 */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.05]">
          <SectionHeader
            num="2"
            title="Travaux"
            open={openSections.travaux}
            onToggle={() => toggle('travaux')}
            badge={['E','F','G'].includes(p.dpe) ? '⚡ DPE urgent' : undefined}
          />
          {openSections.travaux && (
            <div className="px-5 pb-5 space-y-4">

              {/* ── Travaux esthétiques ─────────────────────────────────────── */}
              <div>
                <Label>Travaux esthétiques & aménagement</Label>
                <NumInput
                  value={travauxEsthetiques}
                  onChange={(v) => setTravauxEsthetiques(v)}
                  suffix="€"
                  step={500}
                  placeholder="0"
                />
                <p className="text-[10px] text-zinc-600 mt-1.5 leading-snug">
                  Cuisine, salle de bain, peinture, parquet, aménagements divers…
                </p>
              </div>

              {/* ── Toggle rénovation énergétique ───────────────────────────── */}
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold text-zinc-300">Rénovation énergétique (DPE)</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5 leading-snug">Isolation, chauffage, VMC — éligible MaPrimeRénov&apos; et Eco-PTZ</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRenoDpeEnabled(!renoDpeEnabled)}
                    className={`w-9 h-5 rounded-full transition-all shrink-0 relative ${renoDpeEnabled ? 'bg-emerald-500' : 'bg-white/[0.1]'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${renoDpeEnabled ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </div>

                {/* Bloc DPE conditionnel */}
                {renoDpeEnabled && (() => {
                  const dpeActuel = p.dpe as DpeClass
                  const ordre: DpeClass[] = ['G','F','E','D','C','B','A']
                  const idxActuel = ordre.indexOf(dpeActuel)
                  const cibles = ordre.slice(idxActuel + 1)
                  const dpeCibleValide = cibles.includes(renoDpeCible) ? renoDpeCible : (cibles[0] ?? dpeActuel)
                  const reno = renoCalc

                  const urgence = reno?.urgence
                  const accentBorder = urgence === 'critique' ? 'border-red-500/25' : urgence === 'elevee' ? 'border-orange-500/25' : urgence === 'moderee' ? 'border-amber-500/25' : 'border-emerald-500/20'
                  const accentText  = urgence === 'critique' ? 'text-red-400' : urgence === 'elevee' ? 'text-orange-400' : urgence === 'moderee' ? 'text-amber-400' : 'text-emerald-400'
                  const accentBg    = urgence === 'critique' ? 'bg-red-500/[0.04]' : urgence === 'elevee' ? 'bg-orange-500/[0.04]' : urgence === 'moderee' ? 'bg-amber-500/[0.04]' : 'bg-emerald-500/[0.03]'

                  return (
                    <div className="mt-3.5 space-y-3 border-t border-white/[0.06] pt-3.5">

                      {/* État DPE actuel */}
                      {reno && (
                        <div className={`rounded-lg border ${accentBorder} ${accentBg} px-3 py-2.5 flex items-center gap-2.5`}>
                          <div
                            className="w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0"
                            style={{ backgroundColor: DPE_COLORS[dpeActuel]?.bg ?? '#666', color: DPE_COLORS[dpeActuel]?.text ?? '#fff' }}
                          >
                            {dpeActuel}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-[11px] font-semibold ${accentText}`}>
                              DPE {dpeActuel} — {DPE_LABELS[dpeActuel] ?? dpeActuel}
                            </p>
                            {DPE_INTERDICTION[dpeActuel] ? (
                              <p className={`text-[10px] mt-0.5 ${accentText} opacity-75`}>{DPE_INTERDICTION[dpeActuel]}</p>
                            ) : (
                              <p className="text-[10px] text-zinc-600 mt-0.5">Pas d&apos;interdiction de location prévue</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* DPE cible */}
                      {cibles.length > 0 ? (
                        <div>
                          <Label>DPE cible après travaux</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {cibles.map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setRenoDpeCible(d)}
                                className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all ${
                                  dpeCibleValide === d
                                    ? 'ring-2 ring-white/30 ring-offset-1 ring-offset-transparent scale-105 shadow-md'
                                    : 'opacity-35 hover:opacity-60'
                                }`}
                                style={{ backgroundColor: DPE_COLORS[d]?.bg, color: DPE_COLORS[d]?.text }}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                          {reno && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="h-1 flex-1 bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-500/70 transition-all"
                                  style={{ width: `${Math.min(100, (reno.sautClasses / 6) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-zinc-500 shrink-0">
                                {reno.sautClasses} classe{reno.sautClasses > 1 ? 's' : ''}
                                {reno.sautClasses >= 2 && <span className="text-emerald-500 font-semibold"> ✓ Éligible MPR</span>}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-500 italic py-1">DPE déjà optimal — aucune amélioration possible.</p>
                      )}

                      {cibles.length > 0 && reno && (
                        <>
                          {/* Profil revenus + budget custom côte à côte */}
                          <Row2>
                            <div>
                              <Label>Profil revenus</Label>
                              <select
                                value={renoProfile}
                                onChange={(e) => setRenoProfile(e.target.value as ProfileRevenu)}
                                className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                              >
                                <option value="tres-modeste">Très modeste (30%)</option>
                                <option value="modeste">Modeste (25%)</option>
                                <option value="intermediaire">Intermédiaire (20%)</option>
                                <option value="superieur">Supérieur (15%)</option>
                              </select>
                            </div>
                            <div>
                              <Label>Budget estimé (optionnel)</Label>
                              <div className="relative">
                                <input
                                  type="number"
                                  placeholder={`~${Math.round(reno.coutMoyen / 1000)}k€`}
                                  value={renoBudgetInput}
                                  onChange={(e) => {
                                    setRenoBudgetInput(e.target.value)
                                    const v = parseInt(e.target.value)
                                    setRenoBudgetCustom(v > 0 ? v : undefined)
                                  }}
                                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-xs rounded-lg px-2.5 py-2 pr-7 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 placeholder:text-zinc-600"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600">€</span>
                              </div>
                            </div>
                          </Row2>

                          {/* Cascade aides */}
                          <div className="rounded-xl border border-white/[0.07] overflow-hidden">
                            <div className="px-3 py-2.5 flex items-center justify-between bg-white/[0.02]">
                              <span className="text-[11px] text-zinc-500">Coût brut estimé</span>
                              <div className="text-right">
                                <span className="text-[11px] text-zinc-600 mr-2">fourchette</span>
                                <span className="text-[12px] font-bold text-white tabular-nums">{formatCurrency(reno.coutBas)} – {formatCurrency(reno.coutHaut)}</span>
                              </div>
                            </div>
                            {reno.maprimerenovEligible && (
                              <div className="px-3 py-2.5 flex items-center justify-between border-t border-white/[0.05]">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="text-[11px] text-zinc-400">MaPrimeRénov&apos; bailleur</span>
                                </div>
                                <span className="text-[12px] font-semibold text-emerald-400 tabular-nums">−{formatCurrency(reno.maprimerenovMontant)}</span>
                              </div>
                            )}
                            <div className="px-3 py-2.5 flex items-center justify-between border-t border-white/[0.05]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70 shrink-0" />
                                <span className="text-[11px] text-zinc-400">CEE + TVA réduite 5.5%</span>
                              </div>
                              <span className="text-[12px] font-semibold text-emerald-400 tabular-nums">−{formatCurrency(reno.ceeMontant + reno.tvaMontant)}</span>
                            </div>
                            <div className="px-3 py-3 flex items-center justify-between border-t border-white/[0.08] bg-white/[0.04]">
                              <span className="text-[12px] font-bold text-zinc-200">Coût net après aides</span>
                              <span className="text-[15px] font-black text-white tabular-nums" style={{ letterSpacing: '-0.02em' }}>{formatCurrency(reno.coutNet)}</span>
                            </div>
                            {reno.ecoPtzEligible && (
                              <div className="px-3 py-2.5 flex items-center justify-between border-t border-indigo-500/20 bg-indigo-500/[0.04]">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                  <span className="text-[11px] text-indigo-400 font-medium">Eco-PTZ disponible (prêt à 0%)</span>
                                </div>
                                <span className="text-[12px] font-bold text-indigo-400 tabular-nums">{formatCurrency(reno.ecoPtzMontant)}</span>
                              </div>
                            )}
                          </div>

                          {/* Rendement avant/après */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 text-center">
                              <p className="text-[10px] text-zinc-600 mb-1">Rdt brut avant</p>
                              <p className="text-[15px] font-black text-zinc-400 tabular-nums">{reno.rendBrutAvant.toFixed(1)}%</p>
                            </div>
                            <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 px-3 py-2.5 text-center">
                              <p className="text-[10px] text-emerald-400/70 mb-1">Rdt brut après</p>
                              <p className="text-[15px] font-black text-emerald-400 tabular-nums">{reno.rendBrutApres.toFixed(1)}%</p>
                            </div>
                          </div>

                          {/* LMNP si applicable */}
                          {(p.locType === 'meuble' || p.locType === 'coloc' || p.locType === 'saisonnier') && reno.amortissementAnnuel > 0 && (
                            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-violet-500/[0.05] border border-violet-500/15">
                              <span className="text-[11px] text-zinc-500">Économie fiscale LMNP/an</span>
                              <span className="text-[12px] font-bold text-violet-400 tabular-nums">{formatCurrency(reno.economieImpotAnnuelle)}/an</span>
                            </div>
                          )}

                          {/* Bouton décote */}
                          {reno.decotePct > 0 && (() => {
                            const prixCible = reno.prixAvecDecote
                            const dejaApplique = renoApplied !== null && renoApplied.prixAchat === p.prixAchat
                            return (
                              <button
                                type="button"
                                disabled={dejaApplique}
                                onClick={() => {
                                  setP(prev => ({ ...prev, prixAchat: prixCible }))
                                  setRenoApplied({ prixAchat: prixCible })
                                }}
                                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold transition-all border ${
                                  dejaApplique
                                    ? 'text-zinc-600 bg-white/[0.02] border-white/[0.05] cursor-not-allowed'
                                    : 'text-amber-400 bg-amber-500/[0.08] border-amber-500/20 hover:bg-amber-500/[0.15] hover:border-amber-500/30'
                                }`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d={dejaApplique ? "M5 13l4 4L19 7" : "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"} />
                                </svg>
                                {dejaApplique
                                  ? 'Décote appliquée — modifiez le prix pour recalculer'
                                  : `Appliquer décote marché DPE ${dpeActuel} : ${formatCurrency(prixCible)} (−${Math.round(reno.decotePct * 100)}%)`
                                }
                              </button>
                            )
                          })()}
                        </>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* ── Total travaux ────────────────────────────────────────────── */}
              {p.travaux > 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Total travaux injectés</p>
                    {renoDpeEnabled && renoCalc ? (
                      <p className="text-[10px] text-zinc-600 truncate">
                        {formatCurrency(travauxEsthetiques)} esthétiques + {formatCurrency(renoCalc.coutNet)} DPE net
                      </p>
                    ) : (
                      <p className="text-[10px] text-zinc-600">Injecté dans le calcul (amortissement LMNP inclus)</p>
                    )}
                  </div>
                  <p className="text-[15px] font-bold text-emerald-400 tabular-nums shrink-0" style={{ letterSpacing: '-0.02em' }}>
                    {formatCurrency(p.travaux)}
                  </p>
                </div>
              )}

            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 3 — FINANCEMENT                                             */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.05]">
          <SectionHeader num="3" title="Financement" open={openSections.financement} onToggle={() => toggle('financement')} />
          {openSections.financement && (
            <div className="px-5 pb-5 space-y-4">

              {/* Type prêt */}
              <div>
                <Label>Type de prêt</Label>
                <BtnGroup
                  value={p.loanType}
                  onChange={(v) => set('loanType', v as 'amortissable' | 'in-fine')}
                  options={[
                    { value: 'amortissable', label: '📉 Amortissable' },
                    { value: 'in-fine', label: '💎 In-fine' },
                  ]}
                />
              </div>

              {/* Apport + Taux + Durée */}
              <Row3>
                <div>
                  <Label>Apport</Label>
                  <NumInput value={p.apport} onChange={(v) => set('apport', v)} suffix="€" step={1000} />
                </div>
                <div>
                  <Label>Taux crédit</Label>
                  <NumInput value={p.taux} onChange={(v) => set('taux', v)} suffix="%" step={0.05} />
                </div>
                <div>
                  <Label>Durée</Label>
                  <NumInput value={p.duree} onChange={(v) => set('duree', v)} suffix="ans" min={5} />
                </div>
              </Row3>

              {/* Avancé toggle */}
              <button
                type="button"
                onClick={() => setShowFinancementAvance(!showFinancementAvance)}
                className="flex items-center gap-2 text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg className={`w-3 h-3 transition-transform ${showFinancementAvance ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Frais bancaires & assurance
              </button>

              {showFinancementAvance && (
                <div className="space-y-3 pl-3 border-l border-white/[0.05]">
                  <Row2>
                    <div>
                      <Label>Assurance</Label>
                      <NumInput value={p.assuranceTaux} onChange={(v) => set('assuranceTaux', v)} suffix="%" step={0.01} />
                    </div>
                    <div>
                      <Label>Garantie</Label>
                      <NumInput value={p.fraisGarantiePct} onChange={(v) => set('fraisGarantiePct', v)} suffix="%" step={0.1} />
                    </div>
                  </Row2>
                  <div>
                    <Label>Frais de dossier</Label>
                    <NumInput value={p.fraisDossier} onChange={(v) => set('fraisDossier', v)} suffix="€" />
                  </div>
                </div>
              )}

              <Divider />

              {/* PTZ */}
              <ToggleRow
                label="Prêt à Taux Zéro (PTZ)"
                value={showPtz}
                onChange={(v) => { setShowPtz(v); set('ptzEnabled', v) }}
                hint="Dispositif d'aide à l'accession pour résidence principale neuve"
              />

              {showPtz && (
                <div className="space-y-3 pl-3 border-l border-emerald-500/20">
                  <Row2>
                    <div>
                      <Label>Montant PTZ</Label>
                      <NumInput value={p.ptzMontant} onChange={(v) => set('ptzMontant', v)} suffix="€" step={1000} />
                    </div>
                    <div>
                      <Label>Taux PTZ</Label>
                      <NumInput value={p.ptzTaux} onChange={(v) => set('ptzTaux', v)} suffix="%" step={0.1} />
                    </div>
                  </Row2>
                  <div>
                    <Label>Durée PTZ</Label>
                    <NumInput value={p.ptzDuree} onChange={(v) => set('ptzDuree', v)} suffix="ans" />
                  </div>
                </div>
              )}

              {/* Récap financement */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] text-zinc-500">Montant emprunté</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {Math.max(0, p.prixAchat + p.fraisNotaire + p.travaux - p.apport - (p.ptzEnabled ? p.ptzMontant : 0)).toLocaleString('fr-FR')} €
                </span>
              </div>

            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 4 — LOCATION                                                */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.05]">
          <SectionHeader num="4" title="Location" open={openSections.location} onToggle={() => toggle('location')} />
          {openSections.location && (
            <div className="px-5 pb-5 space-y-4">

              {/* Type location */}
              <div>
                <Label>Régime locatif</Label>
                <BtnGroup
                  cols={2}
                  value={p.locType}
                  onChange={(v) => set('locType', v as InvestmentParams['locType'])}
                  options={[
                    { value: 'nu', label: '🏠 Nu (foncier)' },
                    { value: 'meuble', label: '🛋 Meublé (BIC)' },
                    { value: 'coloc', label: '👥 Colocation' },
                    { value: 'saisonnier', label: '🌴 Saisonnier' },
                  ]}
                />
              </div>

              {/* Loyer selon type */}
              {isNu && (
                <Row2>
                  <div>
                    <Label>Loyer HC / mois</Label>
                    <NumInput value={p.loyerNu} onChange={(v) => set('loyerNu', v)} suffix="€" />
                  </div>
                  <div>
                    <Label>Charges récup. / mois</Label>
                    <NumInput value={p.chargesRecuperables} onChange={(v) => set('chargesRecuperables', v)} suffix="€" />
                  </div>
                </Row2>
              )}

              {isMeuble && (
                <div>
                  <Label>Loyer charges comprises / mois</Label>
                  <NumInput value={p.loyerMeuble} onChange={(v) => set('loyerMeuble', v)} suffix="€" />
                </div>
              )}

              {isColoc && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label>Nombre de chambres</Label>
                      <span className="text-sm font-bold text-white">{p.nbChambres}</span>
                    </div>
                    <input
                      type="range" min={1} max={8} step={1} value={p.nbChambres}
                      onChange={(e) => set('nbChambres', parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-700 mt-1">
                      <span>1</span><span>8 chambres</span>
                    </div>
                  </div>
                  <div>
                    <Label>Loyer par chambre / mois</Label>
                    <NumInput value={p.loyerParChambre} onChange={(v) => set('loyerParChambre', v)} suffix="€" />
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/15">
                    <span className="text-[11px] text-zinc-500">Loyer total</span>
                    <span className="text-sm font-bold text-emerald-400 tabular-nums">
                      {(p.loyerParChambre * p.nbChambres).toLocaleString('fr-FR')} €/mois
                    </span>
                  </div>
                </div>
              )}

              <Divider />

              {/* Vacance locative */}
              <SliderRow
                label="Vacance locative"
                value={p.vacance}
                onChange={(v) => set('vacance', v)}
                min={0}
                max={3}
                step={0.5}
                suffix=" mois/an"
                hint={`${Math.round((p.vacance / 12) * 100)}% de vacance — ${12 - p.vacance} mois loués / an`}
              />

              {/* IRL */}
              <SliderRow
                label="Revalorisation loyer (IRL)"
                value={p.irl ?? 1.5}
                onChange={(v) => set('irl', v)}
                min={0}
                max={4}
                step={0.5}
                suffix="%/an"
                hint="Indexation annuelle estimée des loyers (IRL moyen ~2%)"
              />

              {/* Revenu annuel estimé */}
              {(() => {
                const loyer = isColoc
                  ? p.loyerParChambre * p.nbChambres
                  : isMeuble
                  ? p.loyerMeuble
                  : p.loyerNu
                const revAnnuel = Math.round(loyer * (12 - p.vacance))
                return loyer > 0 ? (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/15">
                    <span className="text-[11px] text-zinc-500">Revenu locatif annuel estimé</span>
                    <span className="text-sm font-bold text-emerald-400 tabular-nums">
                      {revAnnuel.toLocaleString('fr-FR')} €/an
                    </span>
                  </div>
                ) : null
              })()}

            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 5 — CHARGES                                                 */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.05]">
          <SectionHeader num="5" title="Charges annuelles" open={openSections.charges} onToggle={() => toggle('charges')} />
          {openSections.charges && (
            <div className="px-5 pb-5 space-y-3">

              {/* Charges fixes */}
              <Row3>
                <div>
                  <Label>Taxe foncière</Label>
                  <NumInput value={p.taxeFonciere} onChange={(v) => set('taxeFonciere', v)} suffix="€" />
                </div>
                <div>
                  <Label>Charges copro</Label>
                  <NumInput value={p.chargesCopro} onChange={(v) => set('chargesCopro', v)} suffix="€" />
                </div>
                <div>
                  <Label>Assurance PNO</Label>
                  <NumInput value={p.assurancePno} onChange={(v) => set('assurancePno', v)} suffix="€" />
                </div>
              </Row3>

              {/* Charges variables */}
              <Row3>
                <div>
                  <Label>Gestion</Label>
                  <NumInput value={p.fraisGestionPct} onChange={(v) => set('fraisGestionPct', v)} suffix="%" step={0.5} />
                </div>
                <div>
                  <Label>Provision</Label>
                  <NumInput value={p.provisionPct} onChange={(v) => set('provisionPct', v)} suffix="%" step={0.5} />
                </div>
                <div>
                  <Label>GLI</Label>
                  <NumInput value={p.gliPct} onChange={(v) => set('gliPct', v)} suffix="%" step={0.1} />
                </div>
              </Row3>
              <p className="text-[10px] text-zinc-600 -mt-1">GLI : garantie loyers impayés — optionnel, ~2.5% du loyer</p>

              {/* CFE & Comptable — uniquement meublé/coloc/saisonnier */}
              {!isNu && (
                <Row2>
                  <div>
                    <Label>CFE</Label>
                    <NumInput value={p.cfe} onChange={(v) => set('cfe', v)} suffix="€/an" />
                  </div>
                  <div>
                    <Label>Frais comptable</Label>
                    <NumInput value={p.fraisComptable} onChange={(v) => set('fraisComptable', v)} suffix="€/an" />
                  </div>
                </Row2>
              )}

              {/* Total charges estimé */}
              {(() => {
                const loyer = isColoc
                  ? p.loyerParChambre * p.nbChambres
                  : isMeuble ? p.loyerMeuble : p.loyerNu
                const loyerAn = loyer * 12
                const total = Math.round(
                  p.taxeFonciere +
                  p.chargesCopro +
                  p.assurancePno +
                  loyerAn * (p.fraisGestionPct / 100) +
                  loyerAn * (p.provisionPct / 100) +
                  loyerAn * (p.gliPct / 100) +
                  (isNu ? 0 : p.cfe + p.fraisComptable)
                )
                return total > 0 ? (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-[11px] text-zinc-500">Total charges annuelles estimées</span>
                    <span className="text-sm font-bold text-amber-400 tabular-nums">
                      {total.toLocaleString('fr-FR')} €/an
                    </span>
                  </div>
                ) : null
              })()}

            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 6 — FISCALITÉ                                               */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.05]">
          <SectionHeader num="6" title="Fiscalité" open={openSections.fiscalite} onToggle={() => toggle('fiscalite')} badge="Précision max" />
          {openSections.fiscalite && (
            <div className="px-5 pb-5 space-y-4">

              {/* TMI */}
              <div>
                <Label>Tranche marginale d&apos;imposition (TMI)</Label>
                <div className="grid grid-cols-5 gap-1">
                  {[0, 11, 30, 41, 45].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set('tmi', t)}
                      className={`py-2 text-[11px] font-bold rounded-lg transition-all ${
                        p.tmi === t
                          ? 'bg-emerald-500 text-zinc-950'
                          : 'bg-white/[0.04] border border-white/[0.07] text-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {t}%
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-600 mt-1.5">
                  Taux s&apos;appliquant à votre tranche la plus haute de revenus
                </p>
              </div>

              {/* Revenus pro */}
              <div>
                <Label>Revenus professionnels nets / an</Label>
                <NumInput
                  value={p.revenusProAnnuels}
                  onChange={(v) => set('revenusProAnnuels', v)}
                  suffix="€"
                  step={1000}
                />
                <p className="text-[10px] text-zinc-600 mt-1">
                  Utilisé pour calculer l&apos;impact fiscal global sur votre foyer
                </p>
              </div>

              <Divider />

              {/* ── Structure juridique ─────────────────────────────────────── */}
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Structure juridique</p>

              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'nom-propre', icon: '👤', label: 'Nom propre', desc: 'Location directe — foncier ou BIC' },
                  { id: 'sci-ir', icon: '🏛️', label: 'SCI à l\'IR', desc: 'Transparence fiscale — succession' },
                  { id: 'sci-is', icon: '⚖️', label: 'SCI à l\'IS', desc: 'IS 15%/25% — capitalisation' },
                  { id: 'sarl-famille', icon: '👨‍👩‍👧', label: 'SARL famille', desc: 'Meublé IR — avantages LMP' },
                ] as const).map(({ id, icon, label, desc }) => {
                  const active = p.structure === id
                  const disabled = id === 'sarl-famille' && isNu
                  const preview = structurePreviews[id]
                  const rendNN = preview?.rendNetNet ?? null
                  const previewColor = rendNN === null
                    ? ''
                    : rendNN >= 4 ? 'text-emerald-400'
                    : rendNN >= 2 ? 'text-amber-400'
                    : 'text-red-400'
                  const previewBorder = rendNN === null
                    ? (active ? 'border-emerald-500/30' : 'border-white/[0.07]')
                    : rendNN >= 4 ? (active ? 'border-emerald-500/40' : 'border-emerald-500/20')
                    : rendNN >= 2 ? (active ? 'border-amber-500/40' : 'border-amber-500/20')
                    : (active ? 'border-red-500/40' : 'border-red-500/20')
                  const previewBg = rendNN === null
                    ? (active ? 'bg-emerald-500/[0.08]' : 'bg-white/[0.03]')
                    : rendNN >= 4 ? (active ? 'bg-emerald-500/[0.10]' : 'bg-emerald-500/[0.04]')
                    : rendNN >= 2 ? (active ? 'bg-amber-500/[0.10]' : 'bg-amber-500/[0.04]')
                    : (active ? 'bg-red-500/[0.10]' : 'bg-red-500/[0.04]')

                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return
                        setP((prev) => ({
                          ...prev,
                          structure: id,
                          sciIS: id === 'sci-is',
                          sarlFamille: id === 'sarl-famille',
                          lmpEnabled: id === 'nom-propre' ? prev.lmpEnabled : false,
                        }))
                      }}
                      className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border transition-all text-left relative ${
                        disabled
                          ? 'opacity-30 cursor-not-allowed bg-white/[0.02] border-white/[0.05]'
                          : `${previewBg} ${previewBorder} hover:brightness-110`
                      }`}
                    >
                      {/* Indicateur actif */}
                      {active && (
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                      <span className="text-base leading-none">{icon}</span>
                      <p className={`text-[12px] font-bold leading-tight mt-1 ${active ? 'text-white' : 'text-zinc-300'}`}>{label}</p>
                      <p className="text-[10px] text-zinc-500 leading-snug">{desc}</p>

                      {/* Preview rendement nette-nette */}
                      {preview && !disabled && (
                        <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] w-full flex items-center justify-between gap-1">
                          <span className="text-[9px] text-zinc-600 uppercase tracking-wide">Meilleur régime</span>
                          <span className={`text-[11px] font-black tabular-nums ${previewColor}`}>
                            {preview.rendNetNet.toFixed(2)}%
                          </span>
                        </div>
                      )}
                      {!preview && result && !disabled && (
                        <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] w-full">
                          <span className="text-[9px] text-zinc-600">Non applicable</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Résumé de la structure sélectionnée */}
              {structurePreviews[p.structure] && (
                <div className={`rounded-lg px-3 py-2.5 border flex items-center justify-between gap-3 ${
                  (structurePreviews[p.structure]?.rendNetNet ?? 0) >= 4
                    ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                    : (structurePreviews[p.structure]?.rendNetNet ?? 0) >= 2
                    ? 'bg-amber-500/[0.06] border-amber-500/20'
                    : 'bg-red-500/[0.06] border-red-500/20'
                }`}>
                  <div>
                    <p className="text-[10px] text-zinc-500">Régime optimal pour cette structure</p>
                    <p className="text-[12px] font-semibold text-white mt-0.5">{structurePreviews[p.structure]?.bestName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-black tabular-nums ${
                      (structurePreviews[p.structure]?.rendNetNet ?? 0) >= 4 ? 'text-emerald-400'
                      : (structurePreviews[p.structure]?.rendNetNet ?? 0) >= 2 ? 'text-amber-400'
                      : 'text-red-400'
                    }`}>
                      {(structurePreviews[p.structure]?.rendNetNet ?? 0).toFixed(2)}%
                    </p>
                    <p className="text-[9px] text-zinc-600">nette-nette</p>
                  </div>
                </div>
              )}

              {/* LMP toggle — uniquement nom propre + meublé */}
              {p.structure === 'nom-propre' && isMeuble && (
                <ToggleRow
                  label="LMP — Loueur Meublé Pro"
                  value={p.lmpEnabled}
                  onChange={(v) => set('lmpEnabled', v)}
                  hint="Revenus meublés > 23 000€/an et > 50% des revenus du foyer"
                />
              )}

              <Divider />

              {/* ── Profil fiscal ───────────────────────────────────────────── */}
              <div>
                <Label>Profil fiscal</Label>
                <div className="grid grid-cols-2 gap-1">
                  {([
                    { value: 'nouveau', label: '🟢 Investisseur débutant' },
                    { value: 'confirme', label: '🔵 Profil confirmé' },
                  ] as const).map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => set('profilFis', o.value)}
                      className={`py-2 px-2 text-[11px] font-semibold rounded-lg transition-all text-center ${
                        p.profilFis === o.value
                          ? 'bg-emerald-500 text-zinc-950'
                          : 'bg-white/[0.04] border border-white/[0.07] text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.08]'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                {p.profilFis === 'confirme' && (
                  <p className="text-[10px] text-zinc-600 mt-1.5">
                    Mode expert : amortissement par composants LMNP disponible ci-dessous
                  </p>
                )}
              </div>

              {/* ── Amortissement par composants (mode expert) ─────────────── */}
              {p.profilFis === 'confirme' && isMeuble && (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Amortissement par composants — LMNP Réel
                  </p>
                  <div className="rounded-xl border border-white/[0.07] overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-3 px-3 py-2 bg-white/[0.03] border-b border-white/[0.05]">
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase">Composant</span>
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase text-center">% valeur</span>
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase text-right">Durée</span>
                    </div>
                    {/* Rows */}
                    {([
                      { label: 'Gros œuvre', pctKey: 'amortGrosOeuvrePct', ansKey: 'amortGrosOeuvreAns', defaultPct: 50, defaultAns: 50 },
                      { label: 'Façade',     pctKey: 'amortFacadePct',     ansKey: 'amortFacadeAns',     defaultPct: 10, defaultAns: 30 },
                      { label: 'Toiture',    pctKey: 'amortToiturePct',    ansKey: 'amortToitureAns',    defaultPct: 10, defaultAns: 25 },
                      { label: 'Installs.',  pctKey: 'amortInstallationsPct', ansKey: 'amortInstallationsAns', defaultPct: 15, defaultAns: 15 },
                      { label: 'Agenc.',     pctKey: 'amortAgencementsPct', ansKey: 'amortAgencementsAns', defaultPct: 15, defaultAns: 10 },
                    ] as { label: string; pctKey: keyof InvestmentParams; ansKey: keyof InvestmentParams; defaultPct: number; defaultAns: number }[]).map((row) => (
                      <div key={row.label} className="grid grid-cols-3 items-center px-3 py-2 border-b border-white/[0.04] last:border-0">
                        <span className="text-[11px] text-zinc-400">{row.label}</span>
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            value={p[row.pctKey] as number || row.defaultPct}
                            onChange={(e) => set(row.pctKey, parseFloat(e.target.value) || 0)}
                            min={0} max={100} step={1}
                            className="w-14 bg-white/[0.04] border border-white/[0.07] rounded-md text-[11px] text-white text-center py-1 focus:outline-none focus:border-emerald-500/40"
                          />
                          <span className="text-[10px] text-zinc-600 ml-1">%</span>
                        </div>
                        <div className="flex items-center justify-end">
                          <input
                            type="number"
                            value={p[row.ansKey] as number || row.defaultAns}
                            onChange={(e) => set(row.ansKey, parseFloat(e.target.value) || 0)}
                            min={1} max={100} step={1}
                            className="w-14 bg-white/[0.04] border border-white/[0.07] rounded-md text-[11px] text-white text-center py-1 focus:outline-none focus:border-emerald-500/40"
                          />
                          <span className="text-[10px] text-zinc-600 ml-1">ans</span>
                        </div>
                      </div>
                    ))}
                    {/* Travaux row */}
                    {p.travaux > 0 && (
                      <div className="grid grid-cols-3 items-center px-3 py-2 bg-white/[0.02]">
                        <span className="text-[11px] text-zinc-400">Travaux</span>
                        <div className="flex items-center justify-center">
                          <span className="text-[11px] text-zinc-500">100%</span>
                        </div>
                        <div className="flex items-center justify-end">
                          <input
                            type="number"
                            value={p.amortTravauxAns || 10}
                            onChange={(e) => set('amortTravauxAns', parseFloat(e.target.value) || 0)}
                            min={1} max={50} step={1}
                            className="w-14 bg-white/[0.04] border border-white/[0.07] rounded-md text-[11px] text-white text-center py-1 focus:outline-none focus:border-emerald-500/40"
                          />
                          <span className="text-[10px] text-zinc-600 ml-1">ans</span>
                        </div>
                      </div>
                    )}
                    {/* Total check */}
                    <div className="px-3 py-2 bg-white/[0.03] border-t border-white/[0.05] flex items-center justify-between">
                      <span className="text-[10px] text-zinc-600">Total composants</span>
                      <span className={`text-[11px] font-bold tabular-nums ${
                        Math.abs(
                          (p.amortGrosOeuvrePct || 50) +
                          (p.amortFacadePct || 10) +
                          (p.amortToiturePct || 10) +
                          (p.amortInstallationsPct || 15) +
                          (p.amortAgencementsPct || 15) - 100
                        ) < 1 ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {(p.amortGrosOeuvrePct || 50) + (p.amortFacadePct || 10) + (p.amortToiturePct || 10) + (p.amortInstallationsPct || 15) + (p.amortAgencementsPct || 15)}% / 100%
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-600">
                    La somme des composants doit totaliser 100% de la valeur du bien (hors travaux).
                  </p>
                </div>
              )}

              <div className="py-2.5 px-3 rounded-lg bg-blue-500/[0.06] border border-blue-500/15">
                <p className="text-[11px] text-blue-400 font-medium">
                  💡 Le calculateur compare tous les régimes fiscaux disponibles pour votre structure et identifie le plus avantageux.
                </p>
              </div>

            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 7 — REVENTE & TRI                                           */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.05]">
          <SectionHeader num="7" title="Revente & TRI" open={openSections.revente} onToggle={() => toggle('revente')} />
          {openSections.revente && (
            <div className="px-5 pb-5 space-y-4">

              <SliderRow
                label="Horizon de revente"
                value={p.horizonRevente}
                onChange={(v) => set('horizonRevente', v)}
                min={3}
                max={30}
                step={1}
                suffix=" ans"
                hint={`Exonération IR plus-value après 22 ans, totale après 30 ans`}
              />

              <SliderRow
                label="Valorisation annuelle du bien"
                value={p.valorisationAnnuelle}
                onChange={(v) => set('valorisationAnnuelle', v)}
                min={0}
                max={6}
                step={0.5}
                suffix="%/an"
                hint="Moyenne nationale ~2%/an sur 20 ans (varie selon la ville)"
              />

              {/* Preview revente */}
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[11px] text-zinc-500">Prix revente estimé (dans {p.horizonRevente} ans)</span>
                  <span className="text-sm font-bold text-white tabular-nums">
                    {Math.round(p.prixAchat * Math.pow(1 + p.valorisationAnnuelle / 100, p.horizonRevente)).toLocaleString('fr-FR')} €
                  </span>
                </div>
              </div>

              <div className="py-2.5 px-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <p className="text-[11px] text-zinc-500">
                  Le TRI (Taux de Rendement Interne) sera calculé automatiquement après l&apos;analyse et intègre l&apos;ensemble des flux : apport, cashflows annuels, plus-value nette et impôts.
                </p>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* ─── Bouton calcul ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 p-4 border-t border-white/[0.05] bg-[#0c0c0e]/90 backdrop-blur-xl">
        <button
          type="submit"
          disabled={loading || p.prixAchat <= 0}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 text-zinc-950 text-[13px] font-black rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{ letterSpacing: '-0.01em' }}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
              Calcul en cours…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Calculer la rentabilité
            </>
          )}
        </button>
      </div>
    </form>
  )
}
