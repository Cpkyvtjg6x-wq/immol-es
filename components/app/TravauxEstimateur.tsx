'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  POSTES, PosteTravaux, EstimationPoste,
  estimerPoste, totalEstimation, getZoneGeo, ZoneGeo,
} from '@/lib/travaux/costs'
import { getMarcheRef } from '@/lib/marche-reference'
import { formatCurrency } from '@/lib/utils'

// ─── Icônes SVG par catégorie ─────────────────────────────────────────────────

const ICONS: Record<string, React.ReactNode> = {
  peinture: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  ),
  sol: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zm9.75-9.75A2.25 2.25 0 0115.75 3.75H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 0115.75 13.5H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  cuisine: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5M6 10.608v4.384m0 0C6 16.492 8.686 18 12 18s6-1.508 6-3.008m-12 0h12" />
    </svg>
  ),
  sdb: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  electricite: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  plomberie: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  ),
  fenetres: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  ),
  'isolation-combles': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  'isolation-murs': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  chauffage: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
    </svg>
  ),
}

// ─── Couleur par catégorie ────────────────────────────────────────────────────

const CAT_STYLE = {
  esthetique: { border: 'border-blue-500/20',   bg: 'bg-blue-500/[0.04]',   icon: 'text-blue-400',   active: 'border-blue-400/40 bg-blue-500/10'   },
  technique:  { border: 'border-amber-500/20',  bg: 'bg-amber-500/[0.04]',  icon: 'text-amber-400',  active: 'border-amber-400/40 bg-amber-500/10'  },
  isolation:  { border: 'border-emerald-500/20',bg: 'bg-emerald-500/[0.03]',icon: 'text-emerald-400',active: 'border-emerald-400/40 bg-emerald-500/10'},
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TravauxEstimateurProps {
  surface: number
  ville?: string          // pour le coefficient géo (calcul interne getMarcheRef)
  value: number           // total travaux esthétiques actuel
  onChange: (total: number) => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function TravauxEstimateur({ surface, ville, value, onChange }: TravauxEstimateurProps) {
  const zone: ZoneGeo = useMemo(() => {
    if (!ville) return 'province'
    const marche = getMarcheRef(ville, null)
    return getZoneGeo(marche.source !== 'default' ? marche.prixM2 : undefined)
  }, [ville])
  // nbFenetres estimé : ~1 fenêtre pour 10m², min 1
  const nbFenetres = Math.max(1, Math.round(surface / 10))

  // Postes cochés
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Mode manuel override
  const [manualMode, setManualMode] = useState(false)
  const [manualInput, setManualInput] = useState(value > 0 ? String(value) : '')

  // Estimations de tous les postes
  const estimations: EstimationPoste[] = useMemo(
    () => POSTES.map(p => estimerPoste(p, surface, nbFenetres, zone)),
    [surface, nbFenetres, zone],
  )

  // Total des postes sélectionnés
  const selectedEstimations = estimations.filter(e => selected.has(e.poste.id))
  const total = totalEstimation(selectedEstimations)

  // Sync vers le parent
  useEffect(() => {
    if (manualMode) return
    onChange(total.med)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total.med, manualMode])

  const togglePoste = (id: string) => {
    if (manualMode) setManualMode(false)
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleManual = (v: string) => {
    setManualInput(v)
    const n = parseInt(v.replace(/\s/g, ''), 10)
    if (!isNaN(n)) onChange(n)
  }

  const zoneLabel = zone === 'paris' ? 'Paris & couronne (+35%)' : zone === 'grandeville' ? 'Grande ville (+12%)' : 'Province'

  // Grouper par catégorie — isolation/énergie EXCLUE (gérée par le module DPE ci-dessous)
  const groupes: { key: PosteTravaux['categorie']; label: string; postes: EstimationPoste[] }[] = [
    { key: 'esthetique', label: 'Esthétique & aménagement',    postes: estimations.filter(e => e.poste.categorie === 'esthetique') },
    { key: 'technique',  label: 'Technique & mise aux normes', postes: estimations.filter(e => e.poste.categorie === 'technique') },
  ]

  return (
    <div className="space-y-3">

      {/* ── Intro + zone géo ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-500 leading-snug">
          Cochez les postes concernés — le total s&apos;estime automatiquement
        </p>
        <span className="text-[10px] text-zinc-600 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-full shrink-0">
          {zoneLabel}
        </span>
      </div>

      {/* ── Groupes de postes ────────────────────────────────────────────────── */}
      {groupes.map(({ key, label, postes }) => (
        <div key={key} className="space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600">{label}</p>
          <div className="space-y-1.5">
            {postes.map(({ poste, bas, med, haut }) => {
              const isOn = selected.has(poste.id)
              const style = CAT_STYLE[poste.categorie]
              return (
                <button
                  key={poste.id}
                  type="button"
                  onClick={() => togglePoste(poste.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    isOn ? style.active : `${style.border} ${style.bg} hover:brightness-110`
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                    isOn ? `border-current bg-current/20 ${style.icon}` : 'border-white/[0.15]'
                  }`}>
                    {isOn && (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Icône */}
                  <span className={`shrink-0 ${isOn ? style.icon : 'text-zinc-600'}`}>
                    {ICONS[poste.id] ?? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63" />
                      </svg>
                    )}
                  </span>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-semibold truncate ${isOn ? 'text-white' : 'text-zinc-400'}`}>
                      {poste.label}
                    </p>
                    {isOn && (
                      <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug truncate">{poste.description}</p>
                    )}
                  </div>

                  {/* Fourchette */}
                  <div className="text-right shrink-0">
                    <p className={`text-[12px] font-bold tabular-nums ${isOn ? style.icon : 'text-zinc-600'}`}>
                      {formatCurrency(med)}
                    </p>
                    {isOn && (
                      <p className="text-[9px] text-zinc-600 tabular-nums mt-0.5">
                        {formatCurrency(bas)} – {formatCurrency(haut)}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* ── Total estimé ─────────────────────────────────────────────────────── */}
      {selected.size > 0 && !manualMode && (
        <div className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total estimé ({selected.size} poste{selected.size > 1 ? 's' : ''})</p>
            <p className="text-[11px] text-zinc-500 mt-0.5 tabular-nums">
              Fourchette : {formatCurrency(total.bas)} – {formatCurrency(total.haut)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[22px] font-black text-white tabular-nums leading-none" style={{ letterSpacing: '-0.03em' }}>
              {formatCurrency(total.med)}
            </p>
            <button
              type="button"
              onClick={() => { setManualMode(true); setManualInput(String(total.med)) }}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 mt-0.5 transition-colors"
            >
              Modifier manuellement
            </button>
          </div>
        </div>
      )}

      {/* ── Saisie manuelle ──────────────────────────────────────────────────── */}
      {(selected.size === 0 || manualMode) && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-zinc-500">
              {manualMode ? 'Montant personnalisé' : 'Ou saisissez un montant directement'}
            </p>
            {manualMode && selected.size > 0 && (
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                ← Retour à l&apos;estimation
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              value={manualInput}
              onChange={e => handleManual(e.target.value)}
              placeholder="0"
              min={0}
              step={500}
              className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-[13px] font-semibold rounded-xl px-3.5 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 placeholder:text-zinc-700 tabular-nums"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-zinc-600 pointer-events-none">€</span>
          </div>
        </div>
      )}

      {/* ── Pont vers module DPE ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] px-3.5 py-3">
        <svg className="w-3.5 h-3.5 text-emerald-500/60 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          <span className="text-emerald-400 font-semibold">Isolation, chauffage, VMC</span>
          {' '}— utilisez la section <span className="text-zinc-300 font-semibold">Rénovation énergétique</span> ci-dessous.
          Elle calcule automatiquement les aides disponibles (MaPrimeRénov&apos;, Eco-PTZ, CEE) et évite tout double comptage.
        </p>
      </div>

    </div>
  )
}
