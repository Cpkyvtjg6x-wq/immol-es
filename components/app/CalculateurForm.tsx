'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { InvestmentParams, InvestmentResult, LotGroup } from '@/lib/types'
import { DEFAULT_PARAMS, calculerFraisNotaire } from '@/lib/calculator'
import { calculateFiscal } from '@/lib/fiscal'
import { AddressInput } from '@/components/app/AddressInput'
import type { AddressResult } from '@/components/app/AddressInput'
import { calculateRenovation, DpeClass, ProfileRevenu, DPE_COLORS, DPE_LABELS, DPE_INTERDICTION } from '@/lib/renovation'
import { formatCurrency } from '@/lib/utils'
import { IconBuildingOffice, IconBuildingLibrary, IconScale, IconBriefcase, IconHome, IconLightBulb } from '@/components/ui/icons'
import { TravauxEstimateur } from '@/components/app/TravauxEstimateur'
import type { LocalMarketData } from '@/lib/types'

interface Props {
  onCalculate: (params: InvestmentParams) => Promise<void>
  onChange?: (params: InvestmentParams) => void
  onReset?: () => void
  onCollapse?: () => void
  loading: boolean
  initialParams?: InvestmentParams
  result?: InvestmentResult | null
  marketData?: LocalMarketData | null
}

// ─── UI primitives ─────────────────────────────────────────────────────────────

type SectionStatus = 'idle' | 'in_progress' | 'complete'

function SectionBubble({
  num, title, open, onToggle, pct, status, summary, badge, children, domRef, onNext, onFinish,
  revealed = true, isNew = false,
}: {
  num: string
  title: string
  open: boolean
  onToggle: () => void
  pct: number
  status: SectionStatus
  summary: string
  badge?: string
  children?: React.ReactNode
  domRef?: (el: HTMLDivElement | null) => void
  onNext?: () => void
  onFinish?: () => void
  revealed?: boolean
  isNew?: boolean
}) {
  // Section non encore révélée → rien à rendre
  if (!revealed) return null
  const ringColor =
    status === 'complete' ? '#10b981' :
    status === 'in_progress' ? '#f59e0b' :
    'rgba(255,255,255,0.08)'

  const cardBorder =
    open ? 'border-th-border-med bg-th-surface2' :
    status === 'complete' ? 'border-emerald-500/25 bg-emerald-500/[0.02]' :
    status === 'in_progress' ? 'border-amber-500/20 bg-amber-500/[0.015]' :
    'border-th-border bg-th-surface'

  const titleColor =
    open ? 'text-th-text-1' :
    status === 'complete' ? 'text-emerald-500' :
    status === 'in_progress' ? 'text-th-text-1' :
    'text-th-text-2'

  const numStyle =
    status === 'complete' && !open
      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
      : status === 'in_progress' && !open
      ? 'bg-amber-500/15 border-amber-500/25 text-amber-400'
      : 'bg-th-surface2 border-th-border-med text-th-text-2'

  return (
    <div
      ref={domRef}
      className={isNew ? 'section-reveal' : ''}
      style={{ scrollMarginTop: '8px' }}
    >
    <div
      className={`rounded-2xl border ${cardBorder} ${isNew ? 'section-reveal-card' : ''}`}
      style={{ transition: 'border-color 400ms cubic-bezier(0.16,1,0.3,1), background-color 400ms cubic-bezier(0.16,1,0.3,1)' }}
    >
      {/* ── Header — cliquable sur toute la largeur ── */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3.5 px-4 py-[14px] text-left cursor-pointer select-none"
      >
        {/* Badge numéro / check */}
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 border ${numStyle} ${isNew ? 'section-badge-new' : ''}`}
          style={{ transition: 'background-color 400ms cubic-bezier(0.16,1,0.3,1), border-color 400ms cubic-bezier(0.16,1,0.3,1), color 400ms cubic-bezier(0.16,1,0.3,1)' }}
        >
          {status === 'complete' && !open ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : num}
        </div>

        {/* Titre + résumé */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Ligne titre + badge sur la même ligne, ne wrap pas */}
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[13px] font-semibold leading-tight transition-colors duration-250 shrink-0 ${titleColor}`}>
              {title}
            </span>
            {badge && (
              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                {badge}
              </span>
            )}
          </div>
          {/* Résumé : une seule ligne, visible seulement quand replié */}
          <p className={`text-[11px] mt-[3px] leading-tight truncate transition-all duration-250 ${
            open ? 'opacity-0 h-0 mt-0 overflow-hidden' : 'opacity-100 h-auto'
          } ${status === 'idle' ? 'text-th-text-3 italic' : 'text-th-text-2'}`}>
            {status === 'idle' ? 'Non renseigné' : summary}
          </p>
        </div>

        {/* Anneau de progression + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500"
            style={{
              background: `conic-gradient(${ringColor} ${Math.round(pct * 3.6)}deg, rgba(255,255,255,0.05) 0deg)`,
            }}
          >
            <div className="w-[22px] h-[22px] rounded-full bg-th-surface2 flex items-center justify-center">
              {status === 'complete' ? (
                <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : pct > 0 ? (
                <span className="text-[8px] font-bold text-th-text-2 tabular-nums leading-none">{pct}</span>
              ) : null}
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-th-text-3 shrink-0 ${open ? 'rotate-180' : ''}`}
            style={{ transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* ── Contenu — animation grid-template-rows (fluide) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 500ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="overflow-hidden">
          <div
            className="border-t border-th-border pt-1"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? 'translateY(0)' : 'translateY(-6px)',
              transition: open
                ? 'opacity 320ms ease 120ms, transform 480ms cubic-bezier(0.16,1,0.3,1) 60ms'
                : 'opacity 150ms ease, transform 180ms ease',
            }}
          >
            {children}
            {/* Bouton Continuer */}
            {onNext && (
              <div className="px-4 pb-4 pt-2">
                <button
                  type="button"
                  onClick={onNext}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-th-surface2 border border-th-border-med text-[12px] font-semibold text-th-text-2 hover:text-th-text-1 hover:bg-th-surface3 hover:border-th-border-med active:scale-[0.99] transition-all duration-200 cursor-pointer"
                >
                  Continuer
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Bouton Terminer (dernière section) */}
            {onFinish && (
              <div className="px-4 pb-4 pt-2">
                <button
                  type="button"
                  onClick={onFinish}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[12px] font-semibold text-emerald-400 hover:bg-emerald-500/[0.18] hover:border-emerald-500/40 hover:text-emerald-300 active:scale-[0.99] transition-all duration-200 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Terminer la saisie
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-th-text-2 uppercase tracking-wider mb-1.5">{children}</p>
  )
}

function NumInput({
  value, onChange, suffix, placeholder, min = 0, step = 1, readOnly, error, warn,
}: {
  value: number; onChange?: (v: number) => void; suffix?: string
  placeholder?: string; min?: number; step?: number; readOnly?: boolean
  error?: string; warn?: string
}) {
  const [focused, setFocused] = useState(false)
  // Saisie brute locale — permet de taper "3,5" sans que la virgule disparaisse
  const [rawInput, setRawInput] = useState('')

  const displayValue = focused
    ? rawInput
    : (value ? value.toLocaleString('fr-FR') : '')

  const borderClass = error
    ? 'border-red-500/50 focus:border-red-500/70'
    : warn
    ? 'border-amber-500/40 focus:border-amber-500/60'
    : 'border-th-border focus:border-emerald-500/40'

  return (
    <div>
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          readOnly={readOnly}
          onFocus={() => {
            setFocused(true)
            setRawInput(value ? String(value).replace('.', ',') : '')
          }}
          onBlur={(e) => {
            setFocused(false)
            const raw = e.target.value.replace(/\s/g, '').replace(',', '.')
            onChange?.(parseFloat(raw) || 0)
          }}
          onChange={(e) => {
            const str = e.target.value
            setRawInput(str)
            const raw = str.replace(/\s/g, '').replace(',', '.')
            const num = parseFloat(raw)
            if (!isNaN(num)) onChange?.(num)
          }}
          placeholder={placeholder ?? '0'}
          className={`w-full bg-th-surface2 border ${borderClass} rounded-lg text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none transition-all pl-3 ${suffix ? 'pr-9' : 'pr-3'} py-2 tabular-nums ${readOnly ? 'opacity-50 cursor-default' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 text-[11px] text-th-text-2 pointer-events-none">{suffix}</span>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 mt-1 text-[10px] font-medium text-red-400 leading-tight">
          <svg className="w-2.5 h-2.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {!error && warn && (
        <p className="flex items-center gap-1 mt-1 text-[10px] font-medium text-amber-400 leading-tight">
          <svg className="w-2.5 h-2.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {warn}
        </p>
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
                : 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
              : 'bg-th-surface2 border border-th-border text-th-text-2 hover:text-th-text-1 hover:bg-th-surface3'
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
        <span className="text-[12px] font-bold text-th-text-1 tabular-nums">{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-emerald-500 cursor-pointer h-1.5"
      />
      <div className="flex justify-between text-[10px] text-th-text-3 mt-1">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
      {hint && <p className="text-[10px] text-th-text-3 mt-1">{hint}</p>}
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
        <p className={`text-[13px] font-medium ${disabled ? 'text-th-text-3' : 'text-th-text-1'}`}>{label}</p>
        {hint && <p className="text-[10px] text-th-text-3 mt-0.5 leading-snug">{hint}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!value)}
        className={`w-9 h-5 rounded-full transition-all shrink-0 relative mt-0.5 ${
          value && !disabled ? 'bg-emerald-500' : 'bg-th-surface3'
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
  return <div className="border-t border-th-border my-1" />
}

// ─── Indicateur de progression global ──────────────────────────────────────────

function FormProgress({ sectionInfos, onCollapse }: { sectionInfos: Record<string, { status: SectionStatus }>; onCollapse?: () => void }) {
  const sections = Object.values(sectionInfos)
  const completed = sections.filter(s => s.status === 'complete').length
  const inProgress = sections.filter(s => s.status === 'in_progress').length
  const total = sections.length
  const globalPct = Math.round(((completed + inProgress * 0.5) / total) * 100)
  const remaining = total - completed

  // Micro-reward : détecter quand une section passe à "complete"
  const prevCompletedRef = useRef(completed)
  const [reward, setReward] = useState(false)
  const [badgeKey, setBadgeKey] = useState(0)
  useEffect(() => {
    if (completed > prevCompletedRef.current) {
      setReward(true)
      setBadgeKey(k => k + 1)
      const t = setTimeout(() => setReward(false), 750)
      prevCompletedRef.current = completed
      return () => clearTimeout(t)
    }
    prevCompletedRef.current = completed
  }, [completed])

  const isDone = completed === total
  const isNearDone = globalPct >= 80 && !isDone

  const qualityLabel =
    completed === 0 && inProgress === 0 ? 'Démarrez votre analyse →' :
    globalPct < 25  ? 'En route…' :
    globalPct < 50  ? `${globalPct}% — continuez !` :
    globalPct < 75  ? `${globalPct}% — à mi-chemin` :
    globalPct < 100 ? `${globalPct}% — encore ${remaining} section${remaining > 1 ? 's' : ''} !` :
    'Prêt à analyser ✓'

  const qualityColor =
    completed === 0 && inProgress === 0 ? 'text-th-text-3' :
    globalPct < 50  ? 'text-amber-400' :
    globalPct < 80  ? 'text-blue-400' :
    isDone          ? 'text-emerald-400' :
    'text-emerald-400/80'

  const barColor =
    globalPct < 50  ? 'bg-amber-500' :
    globalPct < 80  ? 'bg-blue-500' :
    'bg-emerald-500'

  return (
    <div className="px-3 pt-2 pb-2">
      <div className="flex items-center justify-between mb-1.5">
        <span
          key={qualityLabel}
          className={`text-[10px] font-semibold transition-colors duration-300 ${qualityColor} ${isNearDone || isDone ? 'font-bold' : ''}`}
        >
          {qualityLabel}
        </span>
        <div className="flex items-center gap-2">
          <span
            key={badgeKey}
            className={`text-[10px] tabular-nums font-semibold ${reward ? 'badge-bounce text-emerald-400' : 'text-th-text-3'} transition-colors duration-300`}
          >
            {completed}<span className="opacity-40">/{total}</span>
          </span>
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="w-5 h-5 rounded-md flex items-center justify-center text-th-text-3 hover:text-th-text-1 hover:bg-th-surface3 transition-all cursor-pointer"
              title="Réduire"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="h-[3px] bg-th-surface2 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500 ease-out ${reward ? 'progress-reward' : ''}`}
          style={{ width: `${globalPct}%` }}
        />
      </div>
      {/* Milestones */}
      {globalPct > 0 && (
        <div className="flex justify-between mt-1 px-px">
          {[25, 50, 75, 100].map(milestone => (
            <div
              key={milestone}
              className={`w-0.5 h-0.5 rounded-full transition-colors duration-500 ${globalPct >= milestone ? barColor : 'bg-th-border'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Section IDs (module-level pour stabilité des refs) ────────────────────────
const SECTION_IDS = ['bien', 'travaux', 'financement', 'location', 'charges', 'fiscalite', 'revente'] as const
type SectionId = typeof SECTION_IDS[number]

// ─── Estimation CFE (cotisation minimale LMNP — barèmes 2024) ─────────────────
function estimerCFE(loyerMensuel: number, vacance = 0.5): number {
  const revenuAnnuel = loyerMensuel * (12 - vacance)
  if (revenuAnnuel <= 10_000) return 350
  if (revenuAnnuel <= 32_600) return 600
  if (revenuAnnuel <= 100_000) return 900
  return 1_200
}

// ─── Main form ─────────────────────────────────────────────────────────────────

export function CalculateurForm({ onCalculate, onChange, onReset, onCollapse, loading, initialParams, result, marketData }: Props) {
  const [p, setP] = useState<InvestmentParams>(initialParams ?? DEFAULT_PARAMS)
  // true = valeur CFE posée automatiquement, false = saisie manuelle
  const [cfeIsEstimated, setCfeIsEstimated] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>('bien')
  const [visitedSections, setVisitedSections] = useState<Set<string>>(new Set(['bien']))
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // ─── Reveal progressif des sections ──────────────────────────────────────────
  // Si des params existent déjà (localStorage / edit) → tout afficher d'emblée
  const [revealedSections, setRevealedSections] = useState<Set<SectionId>>(() => {
    if ((initialParams?.prixAchat ?? 0) > 0) return new Set(SECTION_IDS)
    return new Set(['bien'] as SectionId[])
  })
  // Quelle section vient juste d'être révélée (pour l'animation CSS)
  const [justRevealed, setJustRevealed] = useState<Set<string>>(new Set())

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

  // ─── Auto-recalcul CFE quand le loyer change (si valeur estimée) ──────────
  useEffect(() => {
    if (!cfeIsEstimated) return
    const isMeubleLike = ['meuble', 'coloc', 'saisonnier'].includes(p.locType)
    if (!isMeubleLike) return
    const loyerRef = p.locType === 'coloc'
      ? p.loyerParChambre * p.nbChambres
      : p.locType === 'saisonnier'
      ? Math.round((p.prixNuit ?? 0) * (p.tauxOccupation ?? 65) / 100 * 365 / 12)
      : p.loyerMeuble
    if (loyerRef <= 0) return
    const nouveau = estimerCFE(loyerRef, p.vacance)
    if (nouveau !== p.cfe) setP(prev => ({ ...prev, cfe: nouveau }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.loyerMeuble, p.loyerParChambre, p.nbChambres, p.prixNuit, p.tauxOccupation, p.vacance, cfeIsEstimated])

  // Notify parent on every param change (for live calculation)
  useEffect(() => {
    onChange?.(p)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p])

  const set = useCallback(<K extends keyof InvestmentParams>(key: K, val: InvestmentParams[K]) => {
    setP((prev) => ({ ...prev, [key]: val }))
  }, [])

  const openSection = (id: string) => {
    setActiveSection(prev => prev === id ? null : id)
    setVisitedSections(prev => new Set(Array.from(prev).concat(id)))
  }

  const goToNext = (currentId: string) => {
    const idx = SECTION_IDS.indexOf(currentId as SectionId)
    if (idx >= 0 && idx < SECTION_IDS.length - 1) {
      const nextId = SECTION_IDS[idx + 1]
      setActiveSection(nextId)
      setVisitedSections(prev => new Set(Array.from(prev).concat(nextId)))
      // Révéler la prochaine section si elle n'était pas encore visible
      if (!revealedSections.has(nextId)) {
        setRevealedSections(prev => new Set(Array.from(prev).concat(nextId)))
        setJustRevealed(prev => new Set(Array.from(prev).concat(nextId)))
        // Scroll vers la nouvelle section après que l'animation de slide-in ait commencé
        setTimeout(() => {
          const el = sectionRefs.current[nextId]
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 220)
        // Retirer du justRevealed après la fin de l'animation (550ms)
        setTimeout(() => {
          setJustRevealed(prev => {
            const n = new Set(prev)
            n.delete(nextId)
            return n
          })
        }, 600)
      }
    }
  }

  // ─── Infos de progression par section ────────────────────────────────────────
  const sectionInfos = useMemo(() => {
    const vis = visitedSections

    const getLoyerForSection = () => {
      if (p.locType === 'nu') return p.loyerNu
      if (p.locType === 'meuble') return p.loyerMeuble
      if (p.locType === 'coloc') return p.loyerParChambre * p.nbChambres
      if (p.locType === 'saisonnier') return p.prixNuit ?? 0
      if (p.locType === 'immeuble') return (p.lotGroups ?? []).reduce((s, g) => s + g.loyer * g.nb, 0)
      return 0
    }

    const bien = (() => {
      let pts = 0
      if (p.prixAchat > 0) pts += 50
      const hasLoc = !!(p.ville?.trim() || p.adresse?.trim())
      if (hasLoc) pts += 50
      const pct = pts
      const status: SectionStatus =
        pct === 100 && vis.has('bien') ? 'complete' :
        vis.has('bien') && pct > 0 ? 'in_progress' :
        'idle'
      const priceStr = p.prixAchat > 0 ? `${Math.round(p.prixAchat / 1000)}k €` : '—'
      const locStr = p.quartier ? `${p.quartier}, ${p.ville}` : p.ville || '—'
      return { pct, status, summary: `${p.typeBien ?? 'Bien'} · ${priceStr} · ${locStr}` }
    })()

    const travaux = (() => {
      if (!vis.has('travaux')) return { pct: 0, status: 'idle' as SectionStatus, summary: 'Non renseigné' }
      const hasTravaux = p.travaux > 0
      const summary = hasTravaux
        ? `${p.travaux.toLocaleString('fr-FR')} € de travaux${renoDpeEnabled ? ` · DPE → ${renoDpeCible}` : ''}`
        : 'Aucun travaux'
      return { pct: 100, status: 'complete' as SectionStatus, summary }
    })()

    const financement = (() => {
      let pts = 0
      if (p.taux > 0) pts += 50
      if (p.duree > 0) pts += 50
      const pct = pts
      const status: SectionStatus =
        pct === 100 && vis.has('financement') ? 'complete' :
        vis.has('financement') && pct > 0 ? 'in_progress' :
        'idle'
      const apportStr = p.apport > 0 ? `${Math.round(p.apport / 1000)}k € apport · ` : ''
      return { pct, status, summary: `${apportStr}${p.taux}% · ${p.duree} ans` }
    })()

    const location = (() => {
      const loyer = getLoyerForSection()
      const pct = loyer > 0 ? 100 : vis.has('location') ? 50 : 0
      const status: SectionStatus = loyer > 0 ? 'complete' : vis.has('location') ? 'in_progress' : 'idle'
      const locLabels: Record<string, string> = { nu: 'Nu', meuble: 'Meublé', coloc: 'Coloc', saisonnier: 'Saisonnier', immeuble: 'Immeuble' }
      const loyerStr = loyer > 0 ? `${Math.round(loyer).toLocaleString('fr-FR')} €/mois` : '—'
      return { pct, status, summary: `${locLabels[p.locType] ?? p.locType} · ${loyerStr}` }
    })()

    const charges = (() => {
      if (!vis.has('charges')) return { pct: 0, status: 'idle' as SectionStatus, summary: 'Valeurs par défaut' }
      const summary = p.taxeFonciere > 0 ? `Taxe fonc. ${p.taxeFonciere.toLocaleString('fr-FR')} € · Copro ${p.chargesCopro.toLocaleString('fr-FR')} €` : 'Charges configurées'
      return { pct: 100, status: 'complete' as SectionStatus, summary }
    })()

    const fiscalite = (() => {
      if (!vis.has('fiscalite')) return { pct: 0, status: 'idle' as SectionStatus, summary: 'TMI 30% par défaut' }
      const structLabels: Record<string, string> = { 'nom-propre': 'Nom propre', 'sci-ir': 'SCI IR', 'sci-is': 'SCI IS', 'sarl-famille': 'SARL famille' }
      return { pct: 100, status: 'complete' as SectionStatus, summary: `TMI ${p.tmi}% · ${structLabels[p.structure] ?? p.structure}` }
    })()

    const revente = (() => {
      if (!vis.has('revente')) return { pct: 0, status: 'idle' as SectionStatus, summary: 'Non configuré' }
      return { pct: 100, status: 'complete' as SectionStatus, summary: `Horizon ${p.horizonRevente} ans · +${p.valorisationAnnuelle}%/an` }
    })()

    return { bien, travaux, financement, location, charges, fiscalite, revente }
  }, [p, visitedSections, travauxEsthetiques, renoDpeEnabled, renoDpeCible])

  // ─── Auto-scroll vers la section active ───────────────────────────────────────
  useEffect(() => {
    if (!activeSection) return
    const el = sectionRefs.current[activeSection]
    if (el) {
      const timer = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
      return () => clearTimeout(timer)
    }
  }, [activeSection])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCalculate(p)
  }

  const handleReset = () => {
    setP(DEFAULT_PARAMS)
    setCfeIsEstimated(false)
    setActiveSection('bien')
    setVisitedSections(new Set(['bien']))
    setRevealedSections(new Set(['bien'] as SectionId[]))
    setJustRevealed(new Set())
    onReset?.()
  }

  const isMeuble = p.locType === 'meuble'
  const isSaisonnier = p.locType === 'saisonnier'
  const isImmeuble = p.locType === 'immeuble'

  // ─── Lot group helpers (immeuble de rapport) ──────────────────────────────────
  const makeLotGroup = (overrides?: Partial<LotGroup>): LotGroup => ({
    id: Math.random().toString(36).slice(2),
    label: 'T2',
    nb: 1,
    regime: 'meuble',
    loyer: 650,
    vacance: 1,
    prixVente: 0,
    ...overrides,
  })

  const setLotGroups = (groups: LotGroup[]) => setP(prev => ({ ...prev, lotGroups: groups }))

  const addLotGroup = () => {
    setLotGroups([...(p.lotGroups ?? []), makeLotGroup()])
  }

  const removeLotGroup = (id: string) => {
    setLotGroups((p.lotGroups ?? []).filter(g => g.id !== id))
  }

  const updateLotGroup = (id: string, patch: Partial<LotGroup>) => {
    setLotGroups((p.lotGroups ?? []).map(g => g.id === id ? { ...g, ...patch } : g))
  }

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

  // ─── Validations en temps réel ────────────────────────────────────────────────
  const validationErrors = useMemo(() => {
    const coutTotal = p.prixAchat + (p.fraisNotaire ?? 0) + (p.travaux ?? 0)
    return {
      prixAchat: visitedSections.has('bien') && p.prixAchat <= 0
        ? 'Prix requis pour lancer l\'analyse'
        : undefined,
      taux: visitedSections.has('financement') && p.taux > 8
        ? 'Taux inhabituellement élevé — vérifiez'
        : undefined,
      tauxWarn: visitedSections.has('financement') && p.taux > 5 && p.taux <= 8
        ? 'Taux supérieur à la moyenne du marché'
        : undefined,
      apport: visitedSections.has('financement') && p.apport > 0 && p.apport >= coutTotal
        ? 'L\'apport couvre tout le coût — pas d\'emprunt nécessaire ?'
        : undefined,
      loyerNu: visitedSections.has('location') && p.locType === 'nu' && p.loyerNu <= 0
        ? 'Loyer mensuel requis'
        : undefined,
      loyerMeuble: visitedSections.has('location') && p.locType === 'meuble' && p.loyerMeuble <= 0
        ? 'Loyer mensuel requis'
        : undefined,
      loyerColoc: visitedSections.has('location') && p.locType === 'coloc' && p.loyerParChambre <= 0
        ? 'Loyer par chambre requis'
        : undefined,
    }
  }, [p, visitedSections])

  // adresse saisie affichée dans l'input
  const [adresseDisplay, setAdresseDisplay] = useState(
    p.adresse ?? (p.ville ? `${p.quartier ? p.quartier + ', ' : ''}${p.ville}` : '')
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">

      {/* ─── Progression globale — sticky, toujours visible ──────────────── */}
      <div className="shrink-0 border-b border-th-border bg-th-surface2">
        <FormProgress sectionInfos={sectionInfos} onCollapse={onCollapse} />
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-2">

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 1 — LE BIEN                                                 */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <SectionBubble
          num="1" title="Le bien"
          open={activeSection === 'bien'}
          onToggle={() => openSection('bien')}
          onNext={() => goToNext('bien')}
          domRef={el => { sectionRefs.current['bien'] = el }}
          revealed={revealedSections.has('bien')}
          isNew={justRevealed.has('bien')}
          {...sectionInfos.bien}
        >
            <div className="px-4 pt-4 pb-4 space-y-4">

              {/* Type */}
              <div>
                <Label>Type de bien</Label>
                <BtnGroup
                  cols={3}
                  value={p.typeBien ?? 'Appartement'}
                  onChange={(v) => {
                    const wasImmeuble = p.typeBien === 'Immeuble'
                    const nowImmeuble = v === 'Immeuble'
                    setP(prev => {
                      const next: InvestmentParams = { ...prev, typeBien: v }
                      if (nowImmeuble && !wasImmeuble) {
                        // Auto-basculer en mode immeuble + initialiser avec 2 groupes par défaut
                        next.locType = 'immeuble'
                        if (!prev.lotGroups || prev.lotGroups.length === 0) {
                          next.lotGroups = [
                            { id: Math.random().toString(36).slice(2), label: 'T2', nb: 2, regime: 'meuble', loyer: 650, vacance: 1, prixVente: 0 },
                            { id: Math.random().toString(36).slice(2), label: 'T3', nb: 2, regime: 'nu', loyer: 850, vacance: 1, prixVente: 0 },
                          ]
                        }
                      } else if (!nowImmeuble && wasImmeuble) {
                        // Sortie du mode immeuble → revenir à meublé
                        next.locType = 'meuble'
                      }
                      return next
                    })
                  }}
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

              {/* Badge immeuble */}
              {isImmeuble && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-sky-500/[0.06] border border-sky-500/20">
                  <IconBuildingOffice className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-[11px] text-sky-300 font-medium">Mode Immeuble de rapport activé — configurez vos lots dans la section Location</span>
                </div>
              )}

              {/* État */}
              <div>
                <Label>État du bien</Label>
                <BtnGroup
                  value={p.etat}
                  onChange={(v) => set('etat', v as 'ancien' | 'neuf')}
                  options={[
                    { value: 'ancien', label: 'Ancien (~8% notaire)' },
                    { value: 'neuf', label: 'Neuf (~3% notaire)' },
                  ]}
                />
              </div>

              {/* Prix + Surface */}
              <Row2>
                <div>
                  <Label>Prix d'achat</Label>
                  <NumInput value={p.prixAchat} onChange={(v) => set('prixAchat', v)} suffix="€" step={1000} error={validationErrors.prixAchat} />
                  {/* Presets rapides */}
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {[75, 100, 150, 200, 300, 400].map(k => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => set('prixAchat', k * 1000)}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                          p.prixAchat === k * 1000
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-th-surface2 border-th-border text-th-text-3 hover:text-th-text-1 hover:border-th-border-med'
                        }`}
                      >
                        {k}k
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Surface</Label>
                  <NumInput value={p.surface} onChange={(v) => set('surface', v)} suffix="m²" />
                  {/* Presets surface */}
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {[20, 35, 50, 70].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set('surface', s)}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                          p.surface === s
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-th-surface2 border-th-border text-th-text-3 hover:text-th-text-1 hover:border-th-border-med'
                        }`}
                      >
                        {s}m²
                      </button>
                    ))}
                  </div>
                </div>
              </Row2>

              {/* Prix m² */}
              {p.surface > 0 && p.prixAchat > 0 && (
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-th-surface2 border border-th-border">
                  <span className="text-[11px] text-th-text-2">Prix au m²</span>
                  <span className="text-sm font-bold text-th-text-1 tabular-nums">
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
                        : 'bg-th-surface2 text-th-text-2 border border-th-border-med'
                    }`}
                  >
                    {p.fraisNotaireAuto ? 'Auto' : 'Manuel'}
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
                  <p className="text-[10px] text-th-text-3 mt-1">
                    Calculé automatiquement selon l&apos;état du bien
                  </p>
                )}
              </div>

              {/* Prix de revient */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-th-surface2 border border-th-border">
                <span className="text-[11px] text-th-text-2">Prix de revient total</span>
                <span className="text-sm font-bold text-th-text-1 tabular-nums">
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
                        className="flex-1 h-8 rounded-lg text-[11px] font-bold transition-all"
                        style={selected
                          ? { backgroundColor: col.bg, color: col.text, border: `1.5px solid ${col.bg}` }
                          : { backgroundColor: 'transparent', color: col.bg, border: `1.5px solid ${col.bg}40` }
                        }
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

              {/* Adresse / localisation */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Adresse ou quartier</Label>
                  {p.lat && p.lng && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-500/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      GPS localisé
                    </span>
                  )}
                </div>
                <AddressInput
                  value={adresseDisplay}
                  onChangeText={(t) => setAdresseDisplay(t)}
                  onSelect={(result: AddressResult) => {
                    setAdresseDisplay(result.label)
                    setP(prev => ({
                      ...prev,
                      adresse:   result.label,
                      ville:     result.ville,
                      quartier:  result.quartier ?? prev.quartier,
                      lat:       result.lat,
                      lng:       result.lng,
                      codeInsee: result.codeInsee,
                    }))
                  }}
                  placeholder='Ex: "12 rue Nationale, Lyon" ou "Croix-Rousse"'
                />
                <p className="text-[10px] text-th-text-3 mt-1.5">
                  Tapez une adresse, un quartier ou une ville — les suggestions s&apos;affichent automatiquement
                </p>
              </div>

            </div>
        </SectionBubble>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 2 — TRAVAUX                                                 */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <SectionBubble
          num="2" title="Travaux"
          open={activeSection === 'travaux'}
          onToggle={() => openSection('travaux')}
          onNext={() => goToNext('travaux')}
          badge={['E','F','G'].includes(p.dpe) ? 'DPE urgent' : undefined}
          domRef={el => { sectionRefs.current['travaux'] = el }}
          revealed={revealedSections.has('travaux')}
          isNew={justRevealed.has('travaux')}
          {...sectionInfos.travaux}
        >
            <div className="px-4 pt-4 pb-4 space-y-4">

              {/* ── Travaux esthétiques ─────────────────────────────────────── */}
              <div>
                <Label>Travaux esthétiques & aménagement</Label>
                <TravauxEstimateur
                  surface={p.surface || 50}
                  ville={p.ville || undefined}
                  value={travauxEsthetiques}
                  onChange={setTravauxEsthetiques}
                />
              </div>

              {/* ── Toggle rénovation énergétique ───────────────────────────── */}
              <div className="rounded-xl border border-th-border bg-th-surface p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold text-th-text-1">Rénovation énergétique</p>
                    <p className="text-[10px] text-th-text-3 mt-0.5 leading-snug">Isolation, chauffage, VMC — aides MaPrimeRénov&apos;, Eco-PTZ, CEE (distinct des travaux esthétiques)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRenoDpeEnabled(!renoDpeEnabled)}
                    className={`w-9 h-5 rounded-full transition-all shrink-0 relative ${renoDpeEnabled ? 'bg-emerald-500' : 'bg-th-surface3'}`}
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
                    <div className="mt-3.5 space-y-3 border-t border-th-border pt-3.5">

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
                              <p className="text-[10px] text-th-text-3 mt-0.5">Pas d&apos;interdiction de location prévue</p>
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
                                    ? 'ring-2 ring-emerald-500/30 ring-offset-1 ring-offset-transparent scale-105 shadow-md'
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
                              <div className="h-1 flex-1 bg-th-surface2 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-500/70 transition-all"
                                  style={{ width: `${Math.min(100, (reno.sautClasses / 6) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-th-text-2 shrink-0">
                                {reno.sautClasses} classe{reno.sautClasses > 1 ? 's' : ''}
                                {reno.sautClasses >= 2 && <span className="text-emerald-500 font-semibold"> · Éligible MPR</span>}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-th-text-2 italic py-1">DPE déjà optimal — aucune amélioration possible.</p>
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
                                className="w-full bg-th-surface2 border border-th-border-med text-th-text-1 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
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
                                  className="w-full bg-th-surface2 border border-th-border-med text-th-text-1 text-xs rounded-lg px-2.5 py-2 pr-7 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 placeholder:text-th-text-3"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-th-text-3">€</span>
                              </div>
                            </div>
                          </Row2>

                          {/* Cascade aides */}
                          <div className="rounded-xl border border-th-border overflow-hidden">
                            <div className="px-3 py-2.5 flex items-center justify-between bg-th-surface">
                              <span className="text-[11px] text-th-text-2">Coût brut estimé</span>
                              <div className="text-right">
                                <span className="text-[11px] text-th-text-3 mr-2">fourchette</span>
                                <span className="text-[12px] font-bold text-th-text-1 tabular-nums">{formatCurrency(reno.coutBas)} – {formatCurrency(reno.coutHaut)}</span>
                              </div>
                            </div>
                            {reno.maprimerenovEligible && (
                              <div className="px-3 py-2.5 flex items-center justify-between border-t border-th-border">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="text-[11px] text-th-text-2">MaPrimeRénov&apos; bailleur</span>
                                </div>
                                <span className="text-[12px] font-semibold text-emerald-400 tabular-nums">−{formatCurrency(reno.maprimerenovMontant)}</span>
                              </div>
                            )}
                            <div className="px-3 py-2.5 flex items-center justify-between border-t border-th-border">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70 shrink-0" />
                                <span className="text-[11px] text-th-text-2">CEE + TVA réduite 5.5%</span>
                              </div>
                              <span className="text-[12px] font-semibold text-emerald-400 tabular-nums">−{formatCurrency(reno.ceeMontant + reno.tvaMontant)}</span>
                            </div>
                            <div className="px-3 py-3 flex items-center justify-between border-t border-th-border-med bg-th-surface2">
                              <span className="text-[12px] font-bold text-th-text-1">Coût net après aides</span>
                              <span className="text-[15px] font-black text-th-text-1 tabular-nums" style={{ letterSpacing: '-0.02em' }}>{formatCurrency(reno.coutNet)}</span>
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
                            <div className="rounded-lg bg-th-surface2 border border-th-border px-3 py-2.5 text-center">
                              <p className="text-[10px] text-th-text-3 mb-1">Rdt brut avant</p>
                              <p className="text-[15px] font-black text-th-text-2 tabular-nums">{reno.rendBrutAvant.toFixed(1)}%</p>
                            </div>
                            <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 px-3 py-2.5 text-center">
                              <p className="text-[10px] text-emerald-400/70 mb-1">Rdt brut après</p>
                              <p className="text-[15px] font-black text-emerald-400 tabular-nums">{reno.rendBrutApres.toFixed(1)}%</p>
                            </div>
                          </div>

                          {/* LMNP si applicable */}
                          {(p.locType === 'meuble' || p.locType === 'coloc' || p.locType === 'saisonnier') && reno.amortissementAnnuel > 0 && (
                            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-violet-500/[0.05] border border-violet-500/15">
                              <span className="text-[11px] text-th-text-2">Économie fiscale LMNP/an</span>
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
                                    ? 'text-th-text-3 bg-th-surface border-th-border cursor-not-allowed'
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
                    <p className="text-[10px] font-bold text-th-text-2 uppercase tracking-wider mb-0.5">Total travaux injectés</p>
                    {renoDpeEnabled && renoCalc ? (
                      <p className="text-[10px] text-th-text-3 truncate">
                        {formatCurrency(travauxEsthetiques)} esthétiques + {formatCurrency(renoCalc.coutNet)} DPE net
                      </p>
                    ) : (
                      <p className="text-[10px] text-th-text-3">Injecté dans le calcul (amortissement LMNP inclus)</p>
                    )}
                  </div>
                  <p className="text-[15px] font-bold text-emerald-400 tabular-nums shrink-0" style={{ letterSpacing: '-0.02em' }}>
                    {formatCurrency(p.travaux)}
                  </p>
                </div>
              )}

            </div>
        </SectionBubble>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 3 — FINANCEMENT                                             */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <SectionBubble
          num="3" title="Financement"
          open={activeSection === 'financement'}
          onToggle={() => openSection('financement')}
          onNext={() => goToNext('financement')}
          domRef={el => { sectionRefs.current['financement'] = el }}
          revealed={revealedSections.has('financement')}
          isNew={justRevealed.has('financement')}
          {...sectionInfos.financement}
        >
            <div className="px-4 pt-4 pb-4 space-y-4">

              {/* Type prêt */}
              <div>
                <Label>Type de prêt</Label>
                <BtnGroup
                  value={p.loanType}
                  onChange={(v) => set('loanType', v as 'amortissable' | 'in-fine')}
                  options={[
                    { value: 'amortissable', label: 'Amortissable' },
                    { value: 'in-fine', label: 'In-fine' },
                  ]}
                />
              </div>

              {/* Apport + Taux + Durée */}
              <Row3>
                <div>
                  <Label>Apport</Label>
                  <NumInput value={p.apport} onChange={(v) => set('apport', v)} suffix="€" step={1000} warn={validationErrors.apport} />
                </div>
                <div>
                  <Label>Taux crédit</Label>
                  <NumInput value={p.taux} onChange={(v) => set('taux', v)} suffix="%" step={0.05} error={validationErrors.taux} warn={validationErrors.tauxWarn} />
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
                className="flex items-center gap-2 text-[11px] font-semibold text-th-text-2 hover:text-th-text-1 transition-colors"
              >
                <svg className={`w-3 h-3 transition-transform ${showFinancementAvance ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Frais bancaires & assurance
              </button>

              {showFinancementAvance && (
                <div className="space-y-3 pl-3 border-l border-th-border">
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
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-th-surface2 border border-th-border">
                <span className="text-[11px] text-th-text-2">Montant emprunté</span>
                <span className="text-sm font-bold text-th-text-1 tabular-nums">
                  {Math.max(0, p.prixAchat + p.fraisNotaire + p.travaux - p.apport - (p.ptzEnabled ? p.ptzMontant : 0)).toLocaleString('fr-FR')} €
                </span>
              </div>

            </div>
        </SectionBubble>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 4 — LOCATION                                                */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <SectionBubble
          num="4" title="Location"
          open={activeSection === 'location'}
          onToggle={() => openSection('location')}
          onNext={() => goToNext('location')}
          domRef={el => { sectionRefs.current['location'] = el }}
          revealed={revealedSections.has('location')}
          isNew={justRevealed.has('location')}
          {...sectionInfos.location}
        >
            <div className="px-4 pt-4 pb-4 space-y-4">

              {/* Type location — masqué pour immeuble (piloté par Section 1) */}
              {!isImmeuble && (
                <div>
                  <Label>Régime locatif</Label>
                  <BtnGroup
                    cols={2}
                    value={p.locType}
                    onChange={(v) => {
                      const newType = v as InvestmentParams['locType']
                      setP(prev => {
                        const next: InvestmentParams = { ...prev, locType: newType }
                        // ── Transfert loyer entre modes ──────────────────────
                        // meublé → nu : pré-remplir loyerNu si vide (nu ≈ -15%)
                        if (newType === 'nu' && prev.locType === 'meuble' && prev.loyerMeuble > 0 && prev.loyerNu === 0) {
                          next.loyerNu = Math.round(prev.loyerMeuble * 0.85 / 10) * 10
                        }
                        // nu → meublé : pré-remplir loyerMeuble si vide (meublé ≈ +15%)
                        if (newType === 'meuble' && prev.locType === 'nu' && prev.loyerNu > 0 && prev.loyerMeuble === 0) {
                          next.loyerMeuble = Math.round(prev.loyerNu * 1.15 / 10) * 10
                        }
                        // ── Auto-estimation CFE ──────────────────────────────
                        const needsCfe = ['meuble', 'coloc', 'saisonnier'].includes(newType)
                        if (needsCfe && (prev.cfe === 0 || cfeIsEstimated)) {
                          const loyerRef = newType === 'coloc'
                            ? prev.loyerParChambre * prev.nbChambres
                            : newType === 'saisonnier'
                            ? Math.round((prev.prixNuit ?? 0) * (prev.tauxOccupation ?? 65) / 100 * 365 / 12)
                            : next.loyerMeuble || prev.loyerMeuble
                          next.cfe = estimerCFE(loyerRef, prev.vacance)
                          setCfeIsEstimated(true)
                        }
                        if (!needsCfe) {
                          setCfeIsEstimated(false)
                        }
                        return next
                      })
                    }}
                    options={[
                      { value: 'nu', label: 'Nu' },
                      { value: 'meuble', label: 'Meublé' },
                      { value: 'coloc', label: 'Coloc' },
                      { value: 'saisonnier', label: 'Saisonnier' },
                    ]}
                  />
                </div>
              )}

              {/* ── Suggestion loyer marché (si marketData disponible) ── */}
              {marketData && marketData.loyerEstimeTotal > 0 && !isImmeuble && !isSaisonnier && (() => {
                const loyerActuel = isColoc
                  ? p.loyerParChambre * p.nbChambres
                  : isMeuble ? p.loyerMeuble : p.loyerNu
                // Pour coloc : suggérer par chambre
                const loyerSuggereTot = Math.round(marketData.loyerEstimeTotal)
                const loyerSuggere = isColoc && p.nbChambres > 0
                  ? Math.round(loyerSuggereTot / p.nbChambres)
                  : loyerSuggereTot

                // Delta vs marché (quand loyer saisi)
                const delta = loyerActuel > 0
                  ? Math.round(((loyerActuel - loyerSuggereTot) / loyerSuggereTot) * 100)
                  : null

                const isAbove = delta !== null && delta > 15
                const isBelow = delta !== null && delta < -15

                return (
                  <div className={`rounded-lg border px-3 py-2 transition-all ${
                    loyerActuel === 0
                      ? 'bg-sky-500/[0.06] border-sky-500/20'
                      : isAbove
                      ? 'bg-amber-500/[0.05] border-amber-500/20'
                      : isBelow
                      ? 'bg-blue-500/[0.05] border-blue-500/20'
                      : 'bg-th-surface2 border-th-border'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <svg className={`w-3 h-3 shrink-0 ${isAbove ? 'text-amber-400' : isBelow ? 'text-blue-400' : 'text-sky-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <div className="min-w-0">
                          <span className={`text-[10px] font-semibold ${isAbove ? 'text-amber-400' : isBelow ? 'text-blue-400' : 'text-sky-400'}`}>
                            Marché {p.ville || ''} :
                          </span>
                          <span className="text-[10px] text-th-text-1 font-bold tabular-nums ml-1">
                            {loyerSuggereTot.toLocaleString('fr-FR')} €/mois
                          </span>
                          {p.surface > 0 && (
                            <span className="text-[10px] text-th-text-3 ml-1">
                              · {marketData.loyerEstimeM2.toFixed(1)} €/m²
                            </span>
                          )}
                          {delta !== null && (
                            <span className={`text-[10px] font-semibold ml-1.5 ${isAbove ? 'text-amber-400' : isBelow ? 'text-blue-400' : 'text-emerald-400'}`}>
                              {delta > 0 ? '+' : ''}{delta}% vs marché
                            </span>
                          )}
                        </div>
                      </div>
                      {loyerActuel === 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isMeuble) set('loyerMeuble', loyerSuggere)
                            else if (isNu) set('loyerNu', loyerSuggere)
                            else if (isColoc) set('loyerParChambre', loyerSuggere)
                          }}
                          className="shrink-0 text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/25 px-2 py-1 rounded-md hover:bg-sky-500/20 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap"
                        >
                          Appliquer
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* ── NU ─────────────────────────────────────────────── */}
              {isNu && (
                <Row2>
                  <div>
                    <Label>Loyer HC / mois</Label>
                    <NumInput value={p.loyerNu} onChange={(v) => set('loyerNu', v)} suffix="€" error={validationErrors.loyerNu} />
                  </div>
                  <div>
                    <Label>Charges récup. / mois</Label>
                    <NumInput value={p.chargesRecuperables} onChange={(v) => set('chargesRecuperables', v)} suffix="€" />
                  </div>
                </Row2>
              )}

              {/* ── MEUBLÉ ─────────────────────────────────────────── */}
              {isMeuble && (
                <div>
                  <Label>Loyer charges comprises / mois</Label>
                  <NumInput value={p.loyerMeuble} onChange={(v) => set('loyerMeuble', v)} suffix="€" error={validationErrors.loyerMeuble} />
                </div>
              )}

              {/* ── COLOCATION ─────────────────────────────────────── */}
              {isColoc && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label>Nombre de chambres</Label>
                      <span className="text-sm font-bold text-th-text-1">{p.nbChambres}</span>
                    </div>
                    <input
                      type="range" min={1} max={8} step={1} value={p.nbChambres}
                      onChange={(e) => set('nbChambres', parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5"
                    />
                    <div className="flex justify-between text-[10px] text-th-text-3 mt-1">
                      <span>1</span><span>8 chambres</span>
                    </div>
                  </div>
                  <div>
                    <Label>Loyer par chambre / mois</Label>
                    <NumInput value={p.loyerParChambre} onChange={(v) => set('loyerParChambre', v)} suffix="€" error={validationErrors.loyerColoc} />
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/15">
                    <span className="text-[11px] text-th-text-2">Loyer total</span>
                    <span className="text-sm font-bold text-emerald-400 tabular-nums">
                      {(p.loyerParChambre * p.nbChambres).toLocaleString('fr-FR')} €/mois
                    </span>
                  </div>
                </div>
              )}

              {/* ── SAISONNIER ─────────────────────────────────────── */}
              {isSaisonnier && (
                <div className="space-y-4">
                  {/* Prix / nuit + taux occupation */}
                  <Row2>
                    <div>
                      <Label>Prix moyen / nuit</Label>
                      <NumInput value={p.prixNuit ?? 80} onChange={(v) => set('prixNuit', v)} suffix="€" />
                    </div>
                    <div>
                      <Label>Durée moy. séjour</Label>
                      <NumInput value={p.dureeSejourMoyen ?? 3} onChange={(v) => set('dureeSejourMoyen', Math.max(1, v))} suffix=" nuits" step={1} />
                    </div>
                  </Row2>

                  {/* Taux d'occupation slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label>Taux d&apos;occupation</Label>
                      <span className="text-sm font-bold text-th-text-1">{p.tauxOccupation ?? 65}%</span>
                    </div>
                    <input
                      type="range" min={10} max={100} step={5} value={p.tauxOccupation ?? 65}
                      onChange={(e) => set('tauxOccupation', parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5"
                    />
                    <div className="flex justify-between text-[10px] text-th-text-3 mt-1">
                      <span>10% faible</span><span>65% correct</span><span>80% excellent</span>
                    </div>
                  </div>

                  {/* Commission plateforme */}
                  <div>
                    <Label>Commission plateforme</Label>
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      {[
                        { label: 'Direct', value: 0 },
                        { label: 'Airbnb hôte', value: 3 },
                        { label: 'Booking', value: 15 },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => set('commissionPlateforme', opt.value)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-all ${
                            (p.commissionPlateforme ?? 15) === opt.value
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-th-surface2 border-th-border-med text-th-text-2 hover:border-th-border-med'
                          }`}
                        >
                          {opt.label}<br />
                          <span className="font-bold">{opt.value === 0 ? '0%' : `${opt.value}%`}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-th-text-3 mt-1.5">Autre montant : <NumInput value={p.commissionPlateforme ?? 15} onChange={(v) => set('commissionPlateforme', v)} suffix="%" step={1} /></p>
                  </div>

                  {/* Stats auto-calculées */}
                  {(() => {
                    const tauxOcc = (p.tauxOccupation ?? 65) / 100
                    const nuits = Math.round(365 * tauxOcc)
                    const rotations = Math.round(nuits / Math.max(1, p.dureeSejourMoyen ?? 3))
                    const revBrut = Math.round((p.prixNuit ?? 0) * nuits)
                    const revNet = Math.round(revBrut * (1 - (p.commissionPlateforme ?? 15) / 100))
                    return (p.prixNuit ?? 0) > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Nuits louées', val: `${nuits}/an` },
                          { label: 'Rotations', val: `${rotations}/an` },
                          { label: 'Rev. net plateforme', val: `${revNet.toLocaleString('fr-FR')} €/an`, highlight: true },
                        ].map((s, i) => (
                          <div key={i} className={`py-2 px-3 rounded-lg border text-center ${s.highlight ? 'bg-emerald-500/[0.07] border-emerald-500/20' : 'bg-th-surface border-th-border'}`}>
                            <div className="text-[10px] text-th-text-2">{s.label}</div>
                            <div className={`text-[13px] font-bold tabular-nums mt-0.5 ${s.highlight ? 'text-emerald-400' : 'text-th-text-1'}`}>{s.val}</div>
                          </div>
                        ))}
                      </div>
                    ) : null
                  })()}
                </div>
              )}

              {/* ── IMMEUBLE — Configurateur de lots ───────────────── */}
              {isImmeuble && (
                <div className="space-y-3">

                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">
                      <IconBuildingOffice className="w-3 h-3 inline mr-1" />Composition de l&apos;immeuble
                    </p>
                    <span className="text-[10px] text-th-text-3">
                      {(p.lotGroups ?? []).reduce((s, g) => s + g.nb, 0)} lots au total
                    </span>
                  </div>

                  {/* Liste des groupes */}
                  <div className="space-y-2">
                    {(p.lotGroups ?? []).map((g, idx) => (
                      <div key={g.id} className="rounded-xl border border-th-border-med bg-th-surface2 overflow-hidden">

                        {/* Ligne header du groupe */}
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-th-border">
                          {/* Label éditable */}
                          <input
                            type="text"
                            value={g.label}
                            onChange={(e) => updateLotGroup(g.id, { label: e.target.value })}
                            className="flex-1 bg-transparent text-[12px] font-bold text-th-text-1 focus:outline-none placeholder:text-th-text-3"
                            placeholder="T2, Studio…"
                          />
                          {/* Nb lots stepper */}
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => updateLotGroup(g.id, { nb: Math.max(1, g.nb - 1) })}
                              className="w-5 h-5 rounded-md bg-th-surface2 text-th-text-2 hover:text-th-text-1 text-sm flex items-center justify-center transition-colors">−</button>
                            <span className="text-[12px] font-bold text-th-text-1 w-5 text-center tabular-nums">{g.nb}</span>
                            <button type="button" onClick={() => updateLotGroup(g.id, { nb: g.nb + 1 })}
                              className="w-5 h-5 rounded-md bg-th-surface2 text-th-text-2 hover:text-th-text-1 text-sm flex items-center justify-center transition-colors">+</button>
                          </div>
                          <span className="text-[10px] text-th-text-3">lot{g.nb > 1 ? 's' : ''}</span>
                          {/* Supprimer */}
                          {(p.lotGroups ?? []).length > 1 && (
                            <button type="button" onClick={() => removeLotGroup(g.id)}
                              className="ml-1 w-5 h-5 rounded-md bg-red-500/10 text-red-500/60 hover:text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors text-[11px]">✕</button>
                          )}
                        </div>

                        {/* Régime */}
                        <div className="px-3 py-2 border-b border-th-border">
                          <div className="grid grid-cols-3 gap-1">
                            {([
                              { v: 'meuble', label: 'Meublé' },
                              { v: 'nu', label: 'Nu' },
                              { v: 'vendre', label: 'À vendre' },
                            ] as { v: LotGroup['regime']; label: string }[]).map(opt => (
                              <button key={opt.v} type="button"
                                onClick={() => updateLotGroup(g.id, { regime: opt.v })}
                                className={`py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                                  g.regime === opt.v
                                    ? opt.v === 'vendre'
                                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                      : 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                                    : 'bg-th-surface border-th-border text-th-text-2 hover:border-th-border-med'
                                }`}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Champs selon régime */}
                        <div className="px-3 py-2.5">
                          {g.regime !== 'vendre' ? (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-[9px] font-semibold text-th-text-3 uppercase tracking-wider mb-1">Loyer / lot / mois</p>
                                <NumInput value={g.loyer} onChange={(v) => updateLotGroup(g.id, { loyer: v })} suffix="€" />
                              </div>
                              <div>
                                <p className="text-[9px] font-semibold text-th-text-3 uppercase tracking-wider mb-1">Vacance / lot</p>
                                <NumInput value={g.vacance} onChange={(v) => updateLotGroup(g.id, { vacance: Math.max(0, Math.min(12, v)) })} suffix="mois/an" step={0.5} />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-[9px] font-semibold text-th-text-3 uppercase tracking-wider mb-1">Prix de cession / lot</p>
                              <NumInput value={g.prixVente} onChange={(v) => updateLotGroup(g.id, { prixVente: v })} suffix="€" step={1000} />
                            </div>
                          )}
                        </div>

                        {/* Mini synthèse par groupe */}
                        <div className="px-3 pb-2.5">
                          {g.regime !== 'vendre' ? (
                            <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-th-surface border border-th-border">
                              <span className="text-[10px] text-th-text-3">{g.nb} lot{g.nb > 1 ? 's' : ''} → revenu annuel</span>
                              <span className="text-[11px] font-bold text-sky-400 tabular-nums">
                                {Math.round(g.loyer * g.nb * (12 - g.vacance)).toLocaleString('fr-FR')} €/an
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-amber-500/[0.04] border border-amber-500/15">
                              <span className="text-[10px] text-th-text-3">{g.nb} lot{g.nb > 1 ? 's' : ''} → produit de cession</span>
                              <span className="text-[11px] font-bold text-amber-400 tabular-nums">
                                {Math.round(g.prixVente * g.nb).toLocaleString('fr-FR')} €
                              </span>
                            </div>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>

                  {/* Ajouter un groupe */}
                  <button
                    type="button"
                    onClick={addLotGroup}
                    className="w-full py-2 rounded-xl border border-dashed border-th-border-med text-[11px] font-semibold text-th-text-2 hover:text-sky-400 hover:border-sky-500/30 transition-all"
                  >
                    + Ajouter un groupe de lots
                  </button>

                  {/* Synthèse consolidée */}
                  {(() => {
                    const groups = p.lotGroups ?? []
                    const loues = groups.filter(g => g.regime !== 'vendre')
                    const avendre = groups.filter(g => g.regime === 'vendre')
                    const loyerMensuel = loues.reduce((s, g) => s + g.loyer * g.nb, 0)
                    const revAnnuel = loues.reduce((s, g) => s + g.loyer * g.nb * (12 - g.vacance), 0)
                    const prodCession = avendre.reduce((s, g) => s + g.prixVente * g.nb, 0)
                    const nbLouesTotal = loues.reduce((s, g) => s + g.nb, 0)
                    const nbVendreTotal = avendre.reduce((s, g) => s + g.nb, 0)
                    if (groups.length === 0) return null
                    return (
                      <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-3 space-y-2">
                        <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-2">Synthèse immeuble</p>
                        <div className="grid grid-cols-2 gap-2">
                          {nbLouesTotal > 0 && (
                            <>
                              <div className="py-1.5 px-2 rounded-lg bg-th-surface2 border border-th-border text-center">
                                <div className="text-[9px] text-th-text-3 mb-0.5">{nbLouesTotal} lot{nbLouesTotal > 1 ? 's' : ''} loués · loyer/mois</div>
                                <div className="text-[13px] font-bold text-th-text-1 tabular-nums">{loyerMensuel.toLocaleString('fr-FR')} €</div>
                              </div>
                              <div className="py-1.5 px-2 rounded-lg bg-emerald-500/[0.07] border border-emerald-500/20 text-center">
                                <div className="text-[9px] text-emerald-400/70 mb-0.5">Revenu locatif / an</div>
                                <div className="text-[13px] font-bold text-emerald-400 tabular-nums">{Math.round(revAnnuel).toLocaleString('fr-FR')} €</div>
                              </div>
                            </>
                          )}
                          {nbVendreTotal > 0 && (
                            <div className="col-span-2 py-1.5 px-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/20 flex items-center justify-between">
                              <div>
                                <div className="text-[9px] text-th-text-2">{nbVendreTotal} lot{nbVendreTotal > 1 ? 's' : ''} à vendre</div>
                                <div className="text-[10px] text-th-text-3 mt-0.5">Ces produits peuvent rembourser partiellement le crédit</div>
                              </div>
                              <div className="text-[13px] font-bold text-amber-400 tabular-nums">{Math.round(prodCession).toLocaleString('fr-FR')} €</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* ── Destination des fonds de cession ─────────────────── */}
                  {(() => {
                    const prodCession = (p.lotGroups ?? [])
                      .filter(g => g.regime === 'vendre')
                      .reduce((s, g) => s + g.prixVente * g.nb, 0)
                    if (prodCession <= 0) return null

                    // Calcul impact mensualité (simulation locale)
                    const prixRevientLocal = p.prixAchat + p.fraisNotaire + p.travaux
                    const emprunted = Math.max(0, prixRevientLocal - p.apport - (p.ptzEnabled ? p.ptzMontant : 0))
                    const reinjectLocal = p.venteStrategy === 'reinject' ? prodCession
                      : p.venteStrategy === 'partiel' ? prodCession * (p.venteReinjectPct ?? 100) / 100 : 0
                    const emprunter = Math.max(0, emprunted - reinjectLocal)
                    const r = p.taux / 100 / 12
                    const n = p.duree * 12
                    const calcMens = (montant: number) =>
                      montant > 0 && p.taux > 0
                        ? (montant * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
                        : montant / n
                    const mensAvant = calcMens(emprunted)
                    const mensApres = calcMens(emprunter)
                    const delta = mensAvant - mensApres

                    return (
                      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                            Destination des {Math.round(prodCession).toLocaleString('fr-FR')} € de cession
                          </p>
                        </div>

                        {/* Choix stratégie */}
                        <div className="space-y-1.5">
                          {([
                            {
                              v: 'reinject' as const,
                              label: 'Remboursement anticipé total',
                              desc: 'Tous les fonds réduisent le capital du crédit → mensualités plus basses',
                            },
                            {
                              v: 'partiel' as const,
                              label: 'Réinjection partielle',
                              desc: 'Une partie rembourse le crédit, le reste reste en trésorerie',
                            },
                            {
                              v: 'garder' as const,
                              label: 'Conserver en trésorerie',
                              desc: 'Les fonds restent disponibles, le crédit n\'est pas modifié',
                            },
                          ]).map(opt => (
                            <button
                              key={opt.v}
                              type="button"
                              onClick={() => set('venteStrategy', opt.v)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                                p.venteStrategy === opt.v
                                  ? 'bg-amber-500/15 border-amber-500/40'
                                  : 'bg-th-surface border-th-border hover:border-th-border-med'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${p.venteStrategy === opt.v ? 'bg-amber-400 border-amber-400' : 'border-zinc-600'}`} />
                                <span className={`text-[11px] font-semibold ${p.venteStrategy === opt.v ? 'text-amber-300' : 'text-th-text-2'}`}>{opt.label}</span>
                              </div>
                              <p className="text-[10px] text-th-text-3 mt-0.5 ml-5">{opt.desc}</p>
                            </button>
                          ))}
                        </div>

                        {/* Slider % si partiel */}
                        {p.venteStrategy === 'partiel' && (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <Label>Part réinjectée</Label>
                              <span className="text-sm font-bold text-th-text-1">{p.venteReinjectPct ?? 100}%</span>
                            </div>
                            <input
                              type="range" min={10} max={100} step={10}
                              value={p.venteReinjectPct ?? 100}
                              onChange={(e) => set('venteReinjectPct', parseInt(e.target.value))}
                              className="w-full accent-amber-500 cursor-pointer h-1.5"
                            />
                            <div className="flex justify-between text-[10px] text-th-text-3 mt-1">
                              <span>{Math.round(prodCession * (p.venteReinjectPct ?? 100) / 100).toLocaleString('fr-FR')} € remboursés</span>
                              <span>{Math.round(prodCession * (1 - (p.venteReinjectPct ?? 100) / 100)).toLocaleString('fr-FR')} € gardés</span>
                            </div>
                          </div>
                        )}

                        {/* Impact mensualité */}
                        {reinjectLocal > 0 && delta > 1 && (
                          <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 px-3 py-2.5">
                            <p className="text-[10px] text-th-text-2 mb-1.5">Impact sur le crédit</p>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div>
                                <div className="text-[9px] text-th-text-3 mb-0.5">Capital emprunté</div>
                                <div className="text-[11px] font-bold text-th-text-2 tabular-nums line-through">{Math.round(emprunted).toLocaleString('fr-FR')} €</div>
                                <div className="text-[12px] font-bold text-emerald-400 tabular-nums">{Math.round(emprunter).toLocaleString('fr-FR')} €</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-th-text-3 mb-0.5">Mensualité</div>
                                <div className="text-[11px] font-bold text-th-text-2 tabular-nums line-through">{Math.round(mensAvant).toLocaleString('fr-FR')} €</div>
                                <div className="text-[12px] font-bold text-emerald-400 tabular-nums">{Math.round(mensApres).toLocaleString('fr-FR')} €</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-th-text-3 mb-0.5">Gain / mois</div>
                                <div className="text-[14px] font-black text-emerald-400 tabular-nums">−{Math.round(delta).toLocaleString('fr-FR')} €</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {p.venteStrategy === 'garder' && (
                          <p className="text-[10px] text-th-text-3">
                            Ces {Math.round(prodCession).toLocaleString('fr-FR')} € restent en trésorerie et réduisent votre capital effectivement immobilisé dans l&apos;opération.
                          </p>
                        )}
                      </div>
                    )
                  })()}

                </div>
              )}

              <Divider />

              {/* Vacance — uniquement pour nu, meublé, coloc */}
              {!isSaisonnier && !isImmeuble && (
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
              )}

              {/* IRL — pas pour saisonnier */}
              {!isSaisonnier && (
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
              )}

              {/* Revenu annuel estimé — nu / meublé / coloc */}
              {!isSaisonnier && !isImmeuble && (() => {
                const loyer = isColoc
                  ? p.loyerParChambre * p.nbChambres
                  : isMeuble
                  ? p.loyerMeuble
                  : p.loyerNu
                const revAnnuel = Math.round(loyer * (12 - p.vacance))
                return loyer > 0 ? (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/15">
                    <span className="text-[11px] text-th-text-2">Revenu locatif annuel estimé</span>
                    <span className="text-sm font-bold text-emerald-400 tabular-nums">
                      {revAnnuel.toLocaleString('fr-FR')} €/an
                    </span>
                  </div>
                ) : null
              })()}

            </div>
        </SectionBubble>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 5 — CHARGES                                                 */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <SectionBubble
          num="5" title="Charges annuelles"
          open={activeSection === 'charges'}
          onToggle={() => openSection('charges')}
          onNext={() => goToNext('charges')}
          domRef={el => { sectionRefs.current['charges'] = el }}
          revealed={revealedSections.has('charges')}
          isNew={justRevealed.has('charges')}
          {...sectionInfos.charges}
        >
            <div className="px-4 pt-4 pb-4 space-y-3">

              {/* Charges fixes */}
              <Row3>
                <div>
                  <Label>Taxe foncière</Label>
                  <NumInput value={p.taxeFonciere} onChange={(v) => set('taxeFonciere', v)} suffix="€" />
                </div>
                {!isImmeuble && (
                  <div>
                    <Label>Charges copro</Label>
                    <NumInput value={p.chargesCopro} onChange={(v) => set('chargesCopro', v)} suffix="€" />
                  </div>
                )}
                <div>
                  <Label>Assurance PNO</Label>
                  <NumInput value={p.assurancePno} onChange={(v) => set('assurancePno', v)} suffix="€" />
                </div>
              </Row3>

              {/* Charges immeuble de rapport */}
              {isImmeuble && (
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-3 space-y-3">
                  <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Immeuble de rapport</p>
                  <Row2>
                    <div>
                      <Label>Entretien parties communes</Label>
                      <NumInput value={p.entretienPartiesCommunes} onChange={(v) => set('entretienPartiesCommunes', v)} suffix="€/an" step={100} />
                    </div>
                    <div>
                      <Label>Assurance immeuble</Label>
                      <NumInput value={p.assuranceImmeuble} onChange={(v) => set('assuranceImmeuble', v)} suffix="€/an" step={100} />
                    </div>
                  </Row2>
                  <p className="text-[10px] text-th-text-3">Charges copro supprimées — vous êtes le seul copropriétaire (syndicat = vous)</p>
                </div>
              )}

              {/* Charges saisonnières spécifiques */}
              {isSaisonnier && (
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-3 space-y-3">
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Charges exploitation saisonnière</p>
                  <Row3>
                    <div>
                      <Label>Ménage / rotation</Label>
                      <NumInput value={p.fraisMenageParRotation} onChange={(v) => set('fraisMenageParRotation', v)} suffix="€" step={5} />
                    </div>
                    <div>
                      <Label>Conciergerie</Label>
                      <NumInput value={p.fraisConciergerie} onChange={(v) => set('fraisConciergerie', v)} suffix="€/mois" step={10} />
                    </div>
                    <div>
                      <Label>Linge & consommables</Label>
                      <NumInput value={p.fournituresConsommables} onChange={(v) => set('fournituresConsommables', v)} suffix="€/mois" step={5} />
                    </div>
                  </Row3>
                  <Row3>
                    <div>
                      <Label>Électricité / eau</Label>
                      <NumInput value={p.electriciteEau} onChange={(v) => set('electriciteEau', v)} suffix="€/mois" step={10} />
                    </div>
                    <div>
                      <Label>Taxe de séjour</Label>
                      <NumInput value={p.taxeSejour} onChange={(v) => set('taxeSejour', v)} suffix="€/nuit/pers." step={0.1} />
                    </div>
                    <div>
                      <Label>Capacité max</Label>
                      <NumInput value={p.nbPersonnesMax} onChange={(v) => set('nbPersonnesMax', v)} suffix="pers." step={1} />
                    </div>
                  </Row3>
                  {(() => {
                    const tauxOcc = (p.tauxOccupation ?? 65) / 100
                    const nuits = Math.round(365 * tauxOcc)
                    const rotations = p.dureeSejourMoyen > 0 ? Math.round(nuits / p.dureeSejourMoyen) : 0
                    const menageAn = rotations * (p.fraisMenageParRotation ?? 0)
                    const conciergeAn = (p.fraisConciergerie ?? 0) * 12
                    const fournituresAn = (p.fournituresConsommables ?? 0) * 12
                    const elecAn = (p.electriciteEau ?? 0) * 12
                    const taxeAn = (p.taxeSejour ?? 0) * (p.nbPersonnesMax ?? 2) * nuits
                    const totalSaison = menageAn + conciergeAn + fournituresAn + elecAn + taxeAn
                    return totalSaison > 0 ? (
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-th-surface2 border border-th-border">
                        <span className="text-[11px] text-th-text-2">Total charges exploitation estimé</span>
                        <span className="text-sm font-bold text-orange-400 tabular-nums">
                          {Math.round(totalSaison).toLocaleString('fr-FR')} €/an
                        </span>
                      </div>
                    ) : null
                  })()}
                </div>
              )}

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
                {!isSaisonnier && (
                  <div>
                    <Label>GLI</Label>
                    <NumInput value={p.gliPct} onChange={(v) => set('gliPct', v)} suffix="%" step={0.1} />
                  </div>
                )}
              </Row3>
              {!isSaisonnier && (
                <p className="text-[10px] text-th-text-3 -mt-1">GLI : garantie loyers impayés — optionnel, ~2.5% du loyer</p>
              )}

              {/* CFE & Comptable — uniquement meublé/coloc/saisonnier */}
              {!isNu && (
                <Row2>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>CFE</Label>
                      {cfeIsEstimated && (
                        <span className="text-[9px] font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-full">
                          estimé
                        </span>
                      )}
                    </div>
                    <NumInput
                      value={p.cfe}
                      onChange={(v) => {
                        setCfeIsEstimated(false)
                        set('cfe', v)
                      }}
                      suffix="€/an"
                    />
                    {cfeIsEstimated && (
                      <p className="text-[10px] text-th-text-3 mt-1">
                        Barème cotisation minimale LMNP · à affiner selon votre commune
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Frais comptable</Label>
                    <NumInput value={p.fraisComptable} onChange={(v) => set('fraisComptable', v)} suffix="€/an" />
                  </div>
                </Row2>
              )}

              {/* Total charges estimé */}
              {(() => {
                let loyer = 0
                if (isColoc) loyer = p.loyerParChambre * p.nbChambres
                else if (isMeuble) loyer = p.loyerMeuble
                else if (isSaisonnier) {
                  const tauxOcc = (p.tauxOccupation ?? 65) / 100
                  const commission = (p.commissionPlateforme ?? 15) / 100
                  loyer = (p.prixNuit ?? 0) * 365 * tauxOcc * (1 - commission) / 12
                } else if (isImmeuble) loyer = (p.loyerParLot ?? 0) * (p.nbLots ?? 4)
                else loyer = p.loyerNu
                const loyerAn = loyer * 12
                const chargesImmeuble = isImmeuble ? (p.entretienPartiesCommunes ?? 0) + (p.assuranceImmeuble ?? 0) : 0
                const chargesSaison = isSaisonnier ? (() => {
                  const tauxOcc = (p.tauxOccupation ?? 65) / 100
                  const nuits = Math.round(365 * tauxOcc)
                  const rotations = p.dureeSejourMoyen > 0 ? Math.round(nuits / p.dureeSejourMoyen) : 0
                  return rotations * (p.fraisMenageParRotation ?? 0)
                    + (p.fraisConciergerie ?? 0) * 12
                    + (p.fournituresConsommables ?? 0) * 12
                    + (p.electriciteEau ?? 0) * 12
                    + (p.taxeSejour ?? 0) * (p.nbPersonnesMax ?? 2) * nuits
                })() : 0
                const total = Math.round(
                  p.taxeFonciere +
                  (isImmeuble ? 0 : p.chargesCopro) +
                  p.assurancePno +
                  loyerAn * (p.fraisGestionPct / 100) +
                  loyerAn * (p.provisionPct / 100) +
                  (isSaisonnier ? 0 : loyerAn * (p.gliPct / 100)) +
                  (isNu ? 0 : p.cfe + p.fraisComptable) +
                  chargesImmeuble +
                  chargesSaison
                )
                return total > 0 ? (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-th-surface2 border border-th-border">
                    <span className="text-[11px] text-th-text-2">Total charges annuelles estimées</span>
                    <span className="text-sm font-bold text-amber-400 tabular-nums">
                      {total.toLocaleString('fr-FR')} €/an
                    </span>
                  </div>
                ) : null
              })()}

            </div>
        </SectionBubble>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 6 — FISCALITÉ                                               */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <SectionBubble
          num="6" title="Fiscalité"
          open={activeSection === 'fiscalite'}
          onToggle={() => openSection('fiscalite')}
          onNext={() => goToNext('fiscalite')}
          badge="Précision max"
          domRef={el => { sectionRefs.current['fiscalite'] = el }}
          revealed={revealedSections.has('fiscalite')}
          isNew={justRevealed.has('fiscalite')}
          {...sectionInfos.fiscalite}
        >
            <div className="px-4 pt-4 pb-4 space-y-4">

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
                          ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
                          : 'bg-th-surface2 border border-th-border text-th-text-2 hover:text-th-text-1'
                      }`}
                    >
                      {t}%
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-th-text-3 mt-1.5">
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
                <p className="text-[10px] text-th-text-3 mt-1">
                  Utilisé pour calculer l&apos;impact fiscal global sur votre foyer
                </p>
              </div>

              <Divider />

              {/* ── Structure juridique ─────────────────────────────────────── */}
              <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wider">Structure juridique</p>

              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'nom-propre', Icon: IconHome, label: 'Nom propre', desc: 'Location directe — foncier ou BIC' },
                  { id: 'sci-ir', Icon: IconBuildingLibrary, label: 'SCI à l\'IR', desc: 'Transparence fiscale — succession' },
                  { id: 'sci-is', Icon: IconScale, label: 'SCI à l\'IS', desc: 'IS 15%/25% — capitalisation' },
                  { id: 'sarl-famille', Icon: IconBriefcase, label: 'SARL famille', desc: 'Meublé IR — avantages LMP' },
                ] as { id: 'nom-propre' | 'sci-ir' | 'sci-is' | 'sarl-famille'; Icon: React.FC<{ className?: string }>; label: string; desc: string }[]).map(({ id, Icon, label, desc }) => {
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
                    ? (active ? 'border-emerald-500/30' : 'border-th-border')
                    : rendNN >= 4 ? (active ? 'border-emerald-500/40' : 'border-emerald-500/20')
                    : rendNN >= 2 ? (active ? 'border-amber-500/40' : 'border-amber-500/20')
                    : (active ? 'border-red-500/40' : 'border-red-500/20')
                  const previewBg = rendNN === null
                    ? (active ? 'bg-emerald-500/[0.08]' : 'bg-th-surface2')
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
                          ? 'opacity-30 cursor-not-allowed bg-th-surface border-th-border'
                          : `${previewBg} ${previewBorder} hover:brightness-110`
                      }`}
                    >
                      {/* Indicateur actif */}
                      {active && (
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                      <div className="w-6 h-6 rounded-md bg-th-surface2 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-th-text-2" />
                      </div>
                      <p className={`text-[12px] font-bold leading-tight mt-1 ${active ? 'text-th-text-1' : 'text-th-text-2'}`}>{label}</p>
                      <p className="text-[10px] text-th-text-2 leading-snug">{desc}</p>

                      {/* Preview rendement nette-nette */}
                      {preview && !disabled && (
                        <div className="mt-1.5 pt-1.5 border-t border-th-border w-full flex items-center justify-between gap-1">
                          <span className="text-[9px] text-th-text-3 uppercase tracking-wide">Meilleur régime</span>
                          <span className={`text-[11px] font-black tabular-nums ${previewColor}`}>
                            {preview.rendNetNet.toFixed(2)}%
                          </span>
                        </div>
                      )}
                      {!preview && result && !disabled && (
                        <div className="mt-1.5 pt-1.5 border-t border-th-border w-full">
                          <span className="text-[9px] text-th-text-3">Non applicable</span>
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
                    <p className="text-[10px] text-th-text-2">Régime optimal pour cette structure</p>
                    <p className="text-[12px] font-semibold text-th-text-1 mt-0.5">{structurePreviews[p.structure]?.bestName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-black tabular-nums ${
                      (structurePreviews[p.structure]?.rendNetNet ?? 0) >= 4 ? 'text-emerald-400'
                      : (structurePreviews[p.structure]?.rendNetNet ?? 0) >= 2 ? 'text-amber-400'
                      : 'text-red-400'
                    }`}>
                      {(structurePreviews[p.structure]?.rendNetNet ?? 0).toFixed(2)}%
                    </p>
                    <p className="text-[9px] text-th-text-3">nette-nette</p>
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
                    { value: 'nouveau', label: 'Investisseur débutant' },
                    { value: 'confirme', label: 'Profil confirmé' },
                  ] as const).map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => set('profilFis', o.value)}
                      className={`py-2 px-2 text-[11px] font-semibold rounded-lg transition-all text-center ${
                        p.profilFis === o.value
                          ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
                          : 'bg-th-surface2 border border-th-border text-th-text-2 hover:text-th-text-1 hover:bg-th-surface3'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                {p.profilFis === 'confirme' && (
                  <p className="text-[10px] text-th-text-3 mt-1.5">
                    Mode expert : amortissement par composants LMNP disponible ci-dessous
                  </p>
                )}
              </div>

              {/* ── Amortissement par composants (mode expert) ─────────────── */}
              {p.profilFis === 'confirme' && isMeuble && (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-th-text-2 uppercase tracking-wider">
                    Amortissement par composants — LMNP Réel
                  </p>
                  <div className="rounded-xl border border-th-border overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-3 px-3 py-2 bg-th-surface2 border-b border-th-border">
                      <span className="text-[10px] font-semibold text-th-text-3 uppercase">Composant</span>
                      <span className="text-[10px] font-semibold text-th-text-3 uppercase text-center">% valeur</span>
                      <span className="text-[10px] font-semibold text-th-text-3 uppercase text-right">Durée</span>
                    </div>
                    {/* Rows */}
                    {([
                      { label: 'Gros œuvre', pctKey: 'amortGrosOeuvrePct', ansKey: 'amortGrosOeuvreAns', defaultPct: 50, defaultAns: 50 },
                      { label: 'Façade',     pctKey: 'amortFacadePct',     ansKey: 'amortFacadeAns',     defaultPct: 10, defaultAns: 30 },
                      { label: 'Toiture',    pctKey: 'amortToiturePct',    ansKey: 'amortToitureAns',    defaultPct: 10, defaultAns: 25 },
                      { label: 'Installs.',  pctKey: 'amortInstallationsPct', ansKey: 'amortInstallationsAns', defaultPct: 15, defaultAns: 15 },
                      { label: 'Agenc.',     pctKey: 'amortAgencementsPct', ansKey: 'amortAgencementsAns', defaultPct: 15, defaultAns: 10 },
                    ] as { label: string; pctKey: keyof InvestmentParams; ansKey: keyof InvestmentParams; defaultPct: number; defaultAns: number }[]).map((row) => (
                      <div key={row.label} className="grid grid-cols-3 items-center px-3 py-2 border-b border-th-border last:border-0">
                        <span className="text-[11px] text-th-text-2">{row.label}</span>
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            value={p[row.pctKey] as number || row.defaultPct}
                            onChange={(e) => set(row.pctKey, parseFloat(e.target.value) || 0)}
                            min={0} max={100} step={1}
                            className="w-14 bg-th-surface2 border border-th-border rounded-md text-[11px] text-th-text-1 text-center py-1 focus:outline-none focus:border-emerald-500/40"
                          />
                          <span className="text-[10px] text-th-text-3 ml-1">%</span>
                        </div>
                        <div className="flex items-center justify-end">
                          <input
                            type="number"
                            value={p[row.ansKey] as number || row.defaultAns}
                            onChange={(e) => set(row.ansKey, parseFloat(e.target.value) || 0)}
                            min={1} max={100} step={1}
                            className="w-14 bg-th-surface2 border border-th-border rounded-md text-[11px] text-th-text-1 text-center py-1 focus:outline-none focus:border-emerald-500/40"
                          />
                          <span className="text-[10px] text-th-text-3 ml-1">ans</span>
                        </div>
                      </div>
                    ))}
                    {/* Travaux row */}
                    {p.travaux > 0 && (
                      <div className="grid grid-cols-3 items-center px-3 py-2 bg-th-surface">
                        <span className="text-[11px] text-th-text-2">Travaux</span>
                        <div className="flex items-center justify-center">
                          <span className="text-[11px] text-th-text-2">100%</span>
                        </div>
                        <div className="flex items-center justify-end">
                          <input
                            type="number"
                            value={p.amortTravauxAns || 10}
                            onChange={(e) => set('amortTravauxAns', parseFloat(e.target.value) || 0)}
                            min={1} max={50} step={1}
                            className="w-14 bg-th-surface2 border border-th-border rounded-md text-[11px] text-th-text-1 text-center py-1 focus:outline-none focus:border-emerald-500/40"
                          />
                          <span className="text-[10px] text-th-text-3 ml-1">ans</span>
                        </div>
                      </div>
                    )}
                    {/* Total check */}
                    <div className="px-3 py-2 bg-th-surface2 border-t border-th-border flex items-center justify-between">
                      <span className="text-[10px] text-th-text-3">Total composants</span>
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
                  <p className="text-[10px] text-th-text-3">
                    La somme des composants doit totaliser 100% de la valeur du bien (hors travaux).
                  </p>
                </div>
              )}

              <div className="py-2.5 px-3 rounded-lg bg-blue-500/[0.06] border border-blue-500/15">
                <p className="text-[11px] text-blue-400 font-medium">
                  <span className="inline-flex items-center gap-1.5 align-middle"><IconLightBulb className="w-3.5 h-3.5 text-blue-400 shrink-0" /></span>{' '}Le calculateur compare tous les régimes fiscaux disponibles pour votre structure et identifie le plus avantageux.
                </p>
              </div>

            </div>
        </SectionBubble>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* SECTION 7 — REVENTE & TRI                                           */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <SectionBubble
          num="7" title="Revente & TRI"
          open={activeSection === 'revente'}
          onToggle={() => openSection('revente')}
          onFinish={() => setActiveSection(null)}
          domRef={el => { sectionRefs.current['revente'] = el }}
          revealed={revealedSections.has('revente')}
          isNew={justRevealed.has('revente')}
          {...sectionInfos.revente}
        >
            <div className="px-4 pt-4 pb-4 space-y-4">

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
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-th-surface2 border border-th-border">
                  <span className="text-[11px] text-th-text-2">Prix revente estimé (dans {p.horizonRevente} ans)</span>
                  <span className="text-sm font-bold text-th-text-1 tabular-nums">
                    {Math.round(p.prixAchat * Math.pow(1 + p.valorisationAnnuelle / 100, p.horizonRevente)).toLocaleString('fr-FR')} €
                  </span>
                </div>
              </div>

              <div className="py-2.5 px-3 rounded-lg bg-th-surface2 border border-th-border">
                <p className="text-[11px] text-th-text-2">
                  Le TRI (Taux de Rendement Interne) sera calculé automatiquement après l&apos;analyse et intègre l&apos;ensemble des flux : apport, cashflows annuels, plus-value nette et impôts.
                </p>
              </div>

            </div>
        </SectionBubble>

      </div>

      {/* ─── Footer contextuel ─────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-1.5 border-t border-th-border bg-th-surface2/90 backdrop-blur-xl">
        {result ? (
          /* Résultats existants — mise à jour auto + réinitialiser */
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70 shrink-0" />
              <span className="text-[11px] text-th-text-3 truncate">Mise à jour automatique</span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="shrink-0 flex items-center gap-1 text-[11px] text-th-text-3 hover:text-red-400 transition-colors active:scale-[0.97] cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Réinitialiser
            </button>
          </div>
        ) : (
          /* Aucun résultat — CTA primaire */
          <button
            type="submit"
            disabled={loading || p.prixAchat <= 0}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[13px] font-bold rounded-xl hover:bg-emerald-500/20 hover:border-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            style={{ letterSpacing: '-0.01em' }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                Calcul en cours…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Lancer l'analyse
              </>
            )}
          </button>
        )}
      </div>
    </form>
  )
}
