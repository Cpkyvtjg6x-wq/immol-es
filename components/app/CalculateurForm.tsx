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
        className={`w-full bg-white/[0.04] border border-white/[0.07] rounded-lg text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/40 transition-all pl-3 ${suffix ? 'pr-9' : 'pr-3'} py-2 tabular-nums ${readOnly ? 'opacity-50 cursor-default' : ''}`}
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
    financement: true,
    location: true,
    charges: true,
    fiscalite: true,
    revente: false,
    renovation: false,
  })

  // ─── État section rénovation DPE ───────────────────────────────────────────
  const [renoDpeCible, setRenoDpeCible] = useState<DpeClass>('C')
  const [renoProfile, setRenoProfile] = useState<ProfileRevenu>('intermediaire')
  const [renoBudgetInput, setRenoBudgetInput] = useState('')
  const [renoBudgetCustom, setRenoBudgetCustom] = useState<number | undefined>(undefined)
  // Mémorise les valeurs appliquées — bouton désactivé tant qu'elles n'ont pas changé
  const [renoApplied, setRenoApplied] = useState<{ prixAchat: number; travaux: number } | null>(null)
  const [showPtz, setShowPtz] = useState(false)
  const [showFinancementAvance, setShowFinancementAvance] = useState(false)

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

              {/* Prix + Surface + Travaux */}
              <Row3>
                <div>
                  <Label>Prix d'achat</Label>
                  <NumInput value={p.prixAchat} onChange={(v) => set('prixAchat', v)} suffix="€" step={1000} />
                </div>
                <div>
                  <Label>Surface</Label>
                  <NumInput value={p.surface} onChange={(v) => set('surface', v)} suffix="m²" />
                </div>
                <div>
                  <Label>Travaux</Label>
                  <NumInput value={p.travaux} onChange={(v) => set('travaux', v)} suffix="€" step={500} />
                </div>
              </Row3>

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
                <BtnGroup
                  value={p.dpe}
                  onChange={(v) => set('dpe', v)}
                  options={[
                    { value: 'A', label: 'A' }, { value: 'B', label: 'B' },
                    { value: 'C', label: 'C' }, { value: 'D', label: 'D' },
                    { value: 'E', label: 'E' }, { value: 'F', label: 'F' },
                    { value: 'G', label: 'G' },
                  ]}
                />
                {['F', 'G'].includes(p.dpe) && (
                  <p className="text-[10px] text-amber-400 mt-1.5">
                    ⚠ DPE F/G — passoire thermique. Travaux obligatoires à venir.
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
        {/* SECTION 2 — FINANCEMENT                                             */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.05]">
          <SectionHeader num="2" title="Financement" open={openSections.financement} onToggle={() => toggle('financement')} />
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
        {/* SECTION 3 — LOCATION                                                */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.05]">
          <SectionHeader num="3" title="Location" open={openSections.location} onToggle={() => toggle('location')} />
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
        {/* SECTION 4 — CHARGES                                                 */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.05]">
          <SectionHeader num="4" title="Charges annuelles" open={openSections.charges} onToggle={() => toggle('charges')} />
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
        {/* SECTION 5 — FISCALITÉ                                               */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.05]">
          <SectionHeader num="5" title="Fiscalité" open={openSections.fiscalite} onToggle={() => toggle('fiscalite')} badge="Précision max" />
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
        {/* SECTION 6 — REVENTE & TRI                                           */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.05]">
          <SectionHeader num="6" title="Revente & TRI" open={openSections.revente} onToggle={() => toggle('revente')} />
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

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 7 — RÉNOVATION DPE                                          */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.05]">
          <SectionHeader
            num="7"
            title="Rénovation DPE"
            open={openSections.renovation}
            onToggle={() => toggle('renovation')}
            badge={['E','F','G'].includes(p.dpe) ? 'Urgent' : undefined}
          />
          {openSections.renovation && (() => {
            const dpeActuel = p.dpe as DpeClass
            const ordre: DpeClass[] = ['G','F','E','D','C','B','A']
            const idxActuel = ordre.indexOf(dpeActuel)
            const cibles = ordre.slice(idxActuel + 1)

            // S'assurer que dpeCible est valide
            const dpeCibleValide = cibles.includes(renoDpeCible) ? renoDpeCible : (cibles[0] ?? dpeActuel)

            const loyerMensuel =
              p.locType === 'meuble' || p.locType === 'saisonnier' ? p.loyerMeuble :
              p.locType === 'coloc' ? p.loyerParChambre * p.nbChambres :
              p.loyerNu

            const reno = calculateRenovation(
              dpeActuel,
              dpeCibleValide,
              p.surface,
              p.prixAchat,
              loyerMensuel,
              result?.montantEmprunte ?? 0,
              p.tmi,
              renoProfile,
              p.locType,
              renoBudgetCustom,
            )

            const urgence = reno.urgence
            const accentBorder =
              urgence === 'critique' ? 'border-red-500/30' :
              urgence === 'elevee'   ? 'border-orange-500/30' :
              urgence === 'moderee'  ? 'border-amber-500/30' :
              'border-blue-500/20'
            const accentText =
              urgence === 'critique' ? 'text-red-400' :
              urgence === 'elevee'   ? 'text-orange-400' :
              urgence === 'moderee'  ? 'text-amber-400' :
              'text-blue-400'

            return (
              <div className="px-5 pb-5 space-y-4">

                {/* Contexte DPE actuel */}
                <div className={`rounded-xl border ${accentBorder} bg-white/[0.02] p-3 flex items-start gap-3`}>
                  <div
                    className="w-9 h-9 rounded-lg font-black text-base flex items-center justify-center shrink-0"
                    style={{ backgroundColor: DPE_COLORS[dpeActuel]?.bg ?? '#666', color: DPE_COLORS[dpeActuel]?.text ?? '#fff' }}
                  >
                    {dpeActuel}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[12px] font-bold ${accentText}`}>
                      {DPE_LABELS[dpeActuel] ?? dpeActuel}
                      {DPE_INTERDICTION[dpeActuel] && (
                        <span className="ml-2 text-[10px] font-semibold opacity-80">— {DPE_INTERDICTION[dpeActuel]}</span>
                      )}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{reno.recommandation}</p>
                  </div>
                </div>

                {/* DPE cible */}
                {cibles.length > 0 ? (
                  <div>
                    <Label>DPE cible visé</Label>
                    <div className="flex flex-wrap gap-2">
                      {cibles.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setRenoDpeCible(d)}
                          className={`w-9 h-9 rounded-lg text-sm font-black transition-all ${
                            dpeCibleValide === d ? 'ring-2 ring-white/50 scale-110' : 'opacity-50 hover:opacity-80'
                          }`}
                          style={{ backgroundColor: DPE_COLORS[d]?.bg, color: DPE_COLORS[d]?.text }}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-1.5">
                      Saut de {reno.sautClasses} classe{reno.sautClasses > 1 ? 's' : ''}
                      {reno.sautClasses >= 2 ? ' — Éligible MaPrimeRénov\' et Eco-PTZ' : ''}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 italic">DPE déjà optimal — aucune amélioration possible.</p>
                )}

                {cibles.length > 0 && (
                  <>
                    {/* Profil revenus */}
                    <div>
                      <Label>Profil revenus (MaPrimeRénov')</Label>
                      <select
                        value={renoProfile}
                        onChange={(e) => setRenoProfile(e.target.value as ProfileRevenu)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                      >
                        <option value="tres-modeste">Très modeste — aide 30%</option>
                        <option value="modeste">Modeste — aide 25%</option>
                        <option value="intermediaire">Intermédiaire — aide 20%</option>
                        <option value="superieur">Supérieur — aide 15%</option>
                      </select>
                    </div>

                    {/* Budget custom */}
                    <div>
                      <Label>Budget travaux estimé (optionnel)</Label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder={`Estimation auto : ~${Math.round(reno.coutMoyen / 1000)}k€`}
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

                    {/* Résultats inline */}
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.05]">

                      {/* Budget */}
                      <div className="px-3 py-2.5 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">Coût estimé (moyen)</span>
                        <span className="text-sm font-bold text-white tabular-nums">{formatCurrency(reno.coutMoyen)}</span>
                      </div>

                      {/* Aides */}
                      {reno.maprimerenovEligible && (
                        <div className="px-3 py-2.5 flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">MaPrimeRénov'</span>
                          <span className="text-sm font-bold text-emerald-400 tabular-nums">−{formatCurrency(reno.maprimerenovMontant)}</span>
                        </div>
                      )}
                      <div className="px-3 py-2.5 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">CEE + TVA réduite</span>
                        <span className="text-sm font-bold text-emerald-400 tabular-nums">−{formatCurrency(reno.ceeMontant + reno.tvaMontant)}</span>
                      </div>
                      {reno.ecoPtzEligible && (
                        <div className="px-3 py-2.5 flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">Eco-PTZ à 0% (prêt séparé)</span>
                          <span className="text-sm font-bold text-indigo-400 tabular-nums">{formatCurrency(reno.ecoPtzMontant)}</span>
                        </div>
                      )}

                      {/* Coût net */}
                      <div className="px-3 py-3 flex items-center justify-between bg-white/[0.03]">
                        <span className="text-[12px] font-semibold text-zinc-300">Coût net après aides</span>
                        <span className="text-base font-black text-white tabular-nums">{formatCurrency(reno.coutNet)}</span>
                      </div>

                      {/* Décote */}
                      {reno.decotePct > 0 && (
                        <div className="px-3 py-2.5 flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">Décote achat marché ({Math.round(reno.decotePct * 100)}%)</span>
                          <span className="text-sm font-bold text-amber-400 tabular-nums">−{formatCurrency(reno.decoteMontant)}</span>
                        </div>
                      )}

                      {/* Rendement avant/après */}
                      <div className="px-3 py-2.5 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">Rdt brut : avant → après</span>
                        <span className="text-[12px] font-bold text-white tabular-nums">
                          {reno.rendBrutAvant.toFixed(1)}% → <span className="text-emerald-400">{reno.rendBrutApres.toFixed(1)}%</span>
                        </span>
                      </div>

                      {/* LMNP */}
                      {(p.locType === 'meuble' || p.locType === 'coloc' || p.locType === 'saisonnier') && reno.amortissementAnnuel > 0 && (
                        <div className="px-3 py-2.5 flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">Économie LMNP/an (amort.)</span>
                          <span className="text-sm font-bold text-violet-400 tabular-nums">{formatCurrency(reno.economieImpotAnnuelle)}/an</span>
                        </div>
                      )}
                    </div>

                    {/* Bouton appliquer — désactivé si scénario déjà appliqué et params inchangés */}
                    {(() => {
                      const travauxCible = reno.coutNet
                      const prixCible = reno.prixAvecDecote > 0 ? reno.prixAvecDecote : p.prixAchat
                      const dejaApplique =
                        renoApplied !== null &&
                        renoApplied.prixAchat === p.prixAchat &&
                        renoApplied.travaux === p.travaux

                      return (
                        <button
                          type="button"
                          disabled={dejaApplique}
                          onClick={() => {
                            setP(prev => ({ ...prev, travaux: travauxCible, prixAchat: prixCible }))
                            setRenoApplied({ prixAchat: prixCible, travaux: travauxCible })
                          }}
                          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold transition-all border ${
                            dejaApplique
                              ? 'text-zinc-600 bg-white/[0.02] border-white/[0.06] cursor-not-allowed'
                              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/20'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={dejaApplique
                              ? "M5 13l4 4L19 7"
                              : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            } />
                          </svg>
                          {dejaApplique
                            ? 'Scénario appliqué — modifiez les infos pour recalculer'
                            : `Appliquer : travaux ${formatCurrency(travauxCible)}${reno.decotePct > 0 ? ` + prix ${formatCurrency(prixCible)}` : ''}`
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
