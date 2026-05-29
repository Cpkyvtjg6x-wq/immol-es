'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEFAULT_PARAMS, calculateInvestment } from '@/lib/calculator'
import { calculateFiscal } from '@/lib/fiscal'
import { calculateScore } from '@/lib/score'
import type { InvestmentParams, InvestmentResult, ScoreResult } from '@/lib/types'

interface AddOwnedModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: {
    name: string
    params: InvestmentParams
    results: InvestmentResult
    score: ScoreResult
    acquiredAt: string | null
  }) => Promise<{ error: string | null } | void>
}

const STEPS = ['Le bien', 'Financement', 'Loyers & charges', 'Résultats'] as const

const TYPE_OPTIONS = ['Appartement', 'Maison', 'Studio', 'Immeuble', 'Local commercial', 'Parking']
const DPE_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const TMI_OPTIONS = [0, 11, 30, 41, 45]

function today() {
  return new Date().toISOString().slice(0, 10)
}

/* ── champs ── */
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-th-text-2 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-th-text-3 mt-1">{hint}</p>}
    </div>
  )
}

const inputCls =
  'w-full bg-th-input-bg border border-th-input-border rounded-xl px-3.5 py-2.5 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50 transition-colors'

function NumInput({ value, onChange, unit, step, placeholder }: { value: number; onChange: (v: number) => void; unit?: string; step?: number; placeholder?: string }) {
  return (
    <div className="relative">
      <input
        type="number"
        step={step ?? 1}
        value={Number.isFinite(value) && value !== 0 ? value : value === 0 ? '' : ''}
        placeholder={placeholder ?? '0'}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={inputCls + ' pr-10 tabular-nums'}
      />
      {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-th-text-3">{unit}</span>}
    </div>
  )
}

export function AddOwnedModal({ open, onClose, onSubmit }: AddOwnedModalProps) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [manual, setManual] = useState(false)

  const [name, setName] = useState('')
  const [acquiredAt, setAcquiredAt] = useState(today())
  const [f, setF] = useState<Partial<InvestmentParams>>({
    typeBien: 'Appartement',
    etat: 'ancien',
    dpe: 'D',
    locType: 'nu',
    fraisNotaireAuto: true,
    tmi: 30,
  })

  /* overrides manuels (étape résultats) */
  const [ovr, setOvr] = useState<{ rendBrut: number; rendNet: number; cashflow: number; score: number }>({
    rendBrut: 0,
    rendNet: 0,
    cashflow: 0,
    score: 0,
  })

  const set = <K extends keyof InvestmentParams>(k: K, v: InvestmentParams[K]) => setF((p) => ({ ...p, [k]: v }))

  const params = useMemo<InvestmentParams>(() => ({ ...DEFAULT_PARAMS, ...f }), [f])

  const computed = useMemo(() => {
    try {
      const res = calculateInvestment(params)
      const fiscalResult = calculateFiscal(
        {
          tmi: params.tmi,
          prixAchat: params.prixAchat,
          travaux: params.travaux ?? 0,
          prixRevient: res.prixRevient,
          locType: params.locType,
          lmpEnabled: params.lmpEnabled,
          sciIS: params.sciIS,
          sarlFamille: params.sarlFamille,
        },
        res
      )
      const sc = calculateScore(res, fiscalResult, null)
      return { res, sc }
    } catch {
      return null
    }
  }, [params])

  function reset() {
    setStep(0)
    setManual(false)
    setName('')
    setAcquiredAt(today())
    setF({ typeBien: 'Appartement', etat: 'ancien', dpe: 'D', locType: 'nu', fraisNotaireAuto: true, tmi: 30 })
  }

  function close() {
    reset()
    onClose()
  }

  function goResults() {
    if (computed) {
      setOvr({
        rendBrut: Math.round(computed.res.rendementBrut * 100) / 100,
        rendNet: Math.round(computed.res.rendementNet * 100) / 100,
        cashflow: Math.round(computed.res.cashflowMensuel),
        score: computed.sc.global,
      })
    }
    setStep(3)
  }

  async function handleSave() {
    if (!computed) return
    setSaving(true)
    const res: InvestmentResult = { ...computed.res }
    if (manual) {
      res.rendementBrut = ovr.rendBrut
      res.rendBrut = ovr.rendBrut
      res.rendementNet = ovr.rendNet
      res.rendNet = ovr.rendNet
      res.cashflowMensuel = ovr.cashflow
    }
    const score: ScoreResult = manual ? { ...computed.sc, global: Math.round(ovr.score) } : computed.sc
    await onSubmit({
      name: name.trim() || `${f.typeBien ?? 'Bien'} ${f.ville ?? ''}`.trim(),
      params,
      results: res,
      score,
      acquiredAt,
    })
    setSaving(false)
    close()
  }

  const canNext =
    step === 0
      ? (f.prixAchat ?? 0) > 0 && (f.ville ?? '').length > 0
      : true

  const loyer = f.locType === 'meuble' ? (f.loyerMeuble ?? 0) : (f.loyerNu ?? 0)
  const setLoyer = (v: number) => (f.locType === 'meuble' ? set('loyerMeuble', v) : set('loyerNu', v))

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl border border-th-border bg-th-surface shadow-card-th overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header + steps */}
            <div className="px-6 pt-5 pb-4 border-b border-th-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18M3 22h18M9 7h.01M15 7h.01M9 11h.01M15 11h.01" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-th-text-1">Ajouter un bien détenu</h3>
                </div>
                <button onClick={close} className="text-th-text-3 hover:text-th-text-1 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Steps */}
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex-1">
                    <div className={`h-1 rounded-full transition-colors ${i <= step ? 'bg-emerald-500' : 'bg-th-surface3'}`} />
                    <p className={`text-[10px] mt-1.5 transition-colors ${i === step ? 'text-th-text-1 font-semibold' : 'text-th-text-3'}`}>{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  {/* STEP 0 — Le bien */}
                  {step === 0 && (
                    <>
                      <Field label="Nom du bien">
                        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : T3 Lyon Croix-Rousse" />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Ville">
                          <input className={inputCls} value={f.ville ?? ''} onChange={(e) => set('ville', e.target.value)} placeholder="Lyon" />
                        </Field>
                        <Field label="Date d’acquisition">
                          <input type="date" max={today()} className={inputCls} value={acquiredAt} onChange={(e) => setAcquiredAt(e.target.value)} />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Type de bien">
                          <select className={inputCls} value={f.typeBien} onChange={(e) => set('typeBien', e.target.value)}>
                            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </Field>
                        <Field label="Surface">
                          <NumInput value={f.surface ?? 0} onChange={(v) => set('surface', v)} unit="m²" />
                        </Field>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Field label="Prix d’achat">
                          <NumInput value={f.prixAchat ?? 0} onChange={(v) => set('prixAchat', v)} unit="€" />
                        </Field>
                        <Field label="État">
                          <select className={inputCls} value={f.etat} onChange={(e) => set('etat', e.target.value as InvestmentParams['etat'])}>
                            <option value="ancien">Ancien</option>
                            <option value="neuf">Neuf</option>
                          </select>
                        </Field>
                        <Field label="DPE">
                          <select className={inputCls} value={f.dpe} onChange={(e) => set('dpe', e.target.value)}>
                            {DPE_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </Field>
                      </div>
                    </>
                  )}

                  {/* STEP 1 — Financement */}
                  {step === 1 && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Apport">
                          <NumInput value={f.apport ?? 0} onChange={(v) => set('apport', v)} unit="€" />
                        </Field>
                        <Field label="Travaux">
                          <NumInput value={f.travaux ?? 0} onChange={(v) => set('travaux', v)} unit="€" />
                        </Field>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Field label="Taux du prêt">
                          <NumInput value={f.taux ?? 0} onChange={(v) => set('taux', v)} unit="%" step={0.01} />
                        </Field>
                        <Field label="Durée">
                          <NumInput value={f.duree ?? 0} onChange={(v) => set('duree', v)} unit="ans" />
                        </Field>
                        <Field label="Assurance">
                          <NumInput value={f.assuranceTaux ?? 0} onChange={(v) => set('assuranceTaux', v)} unit="%" step={0.01} />
                        </Field>
                      </div>
                      <Field label="Frais de notaire" hint="Calculés automatiquement selon le prix et l’état du bien.">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => set('fraisNotaireAuto', !f.fraisNotaireAuto)}
                            className="relative w-10 h-6 rounded-full transition-colors shrink-0"
                            style={{ background: f.fraisNotaireAuto ? '#10b981' : 'var(--c-border-med)' }}
                          >
                            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: f.fraisNotaireAuto ? 'translateX(16px)' : 'translateX(0)' }} />
                          </button>
                          {f.fraisNotaireAuto ? (
                            <span className="text-sm text-th-text-2">Automatique</span>
                          ) : (
                            <div className="flex-1"><NumInput value={f.fraisNotaire ?? 0} onChange={(v) => set('fraisNotaire', v)} unit="€" /></div>
                          )}
                        </div>
                      </Field>
                    </>
                  )}

                  {/* STEP 2 — Loyers & charges */}
                  {step === 2 && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Type de location">
                          <select className={inputCls} value={f.locType} onChange={(e) => set('locType', e.target.value as InvestmentParams['locType'])}>
                            <option value="nu">Location nue</option>
                            <option value="meuble">Meublé (LMNP)</option>
                            <option value="coloc">Colocation</option>
                          </select>
                        </Field>
                        {f.locType === 'coloc' ? (
                          <Field label="Loyer / chambre">
                            <NumInput value={f.loyerParChambre ?? 0} onChange={(v) => set('loyerParChambre', v)} unit="€" />
                          </Field>
                        ) : (
                          <Field label="Loyer mensuel">
                            <NumInput value={loyer} onChange={setLoyer} unit="€" />
                          </Field>
                        )}
                      </div>
                      {f.locType === 'coloc' && (
                        <Field label="Nombre de chambres">
                          <NumInput value={f.nbChambres ?? 0} onChange={(v) => set('nbChambres', v)} />
                        </Field>
                      )}
                      <div className="grid grid-cols-3 gap-3">
                        <Field label="Taxe foncière">
                          <NumInput value={f.taxeFonciere ?? 0} onChange={(v) => set('taxeFonciere', v)} unit="€/an" />
                        </Field>
                        <Field label="Charges copro">
                          <NumInput value={f.chargesCopro ?? 0} onChange={(v) => set('chargesCopro', v)} unit="€/an" />
                        </Field>
                        <Field label="Assurance PNO">
                          <NumInput value={f.assurancePno ?? 0} onChange={(v) => set('assurancePno', v)} unit="€/an" />
                        </Field>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Field label="Gestion">
                          <NumInput value={f.fraisGestionPct ?? 0} onChange={(v) => set('fraisGestionPct', v)} unit="%" step={0.5} />
                        </Field>
                        <Field label="Vacance">
                          <NumInput value={f.vacance ?? 0} onChange={(v) => set('vacance', v)} unit="mois" step={0.5} />
                        </Field>
                        <Field label="TMI">
                          <select className={inputCls} value={f.tmi} onChange={(e) => set('tmi', parseInt(e.target.value, 10))}>
                            {TMI_OPTIONS.map((t) => <option key={t} value={t}>{t} %</option>)}
                          </select>
                        </Field>
                      </div>
                    </>
                  )}

                  {/* STEP 3 — Résultats */}
                  {step === 3 && computed && (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Rendement brut', val: `${computed.res.rendementBrut.toFixed(1)} %`, color: '#10b981' },
                          { label: 'Rendement net', val: `${computed.res.rendementNet.toFixed(1)} %`, color: '#10b981' },
                          { label: 'Cashflow', val: `${computed.res.cashflowMensuel >= 0 ? '+' : ''}${Math.round(computed.res.cashflowMensuel)} €`, color: computed.res.cashflowMensuel >= 0 ? '#10b981' : '#ef4444' },
                        ].map((k) => (
                          <div key={k.label} className="rounded-xl bg-th-surface2 border border-th-border p-3 text-center">
                            <p className="text-[9px] font-semibold text-th-text-3 uppercase tracking-wider mb-1">{k.label}</p>
                            <p className="text-base font-black tabular-nums" style={{ color: k.color }}>{k.val}</p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-xl bg-th-surface2 border border-th-border p-3 flex items-center justify-between">
                        <span className="text-sm text-th-text-2">Score Immora</span>
                        <span className="text-lg font-black text-th-text-1 tabular-nums">{computed.sc.global}<span className="text-xs text-th-text-3"> /100</span></span>
                      </div>

                      <label className="flex items-center gap-3 py-1 cursor-pointer">
                        <button
                          type="button"
                          onClick={() => setManual((m) => !m)}
                          className="relative w-10 h-6 rounded-full transition-colors shrink-0"
                          style={{ background: manual ? '#10b981' : 'var(--c-border-med)' }}
                        >
                          <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: manual ? 'translateX(16px)' : 'translateX(0)' }} />
                        </button>
                        <div>
                          <p className="text-sm font-medium text-th-text-1">Saisir mes chiffres réels</p>
                          <p className="text-[11px] text-th-text-2">Remplacer les valeurs calculées par vos données réelles.</p>
                        </div>
                      </label>

                      {manual && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-3 pt-1">
                          <Field label="Rendement brut">
                            <NumInput value={ovr.rendBrut} onChange={(v) => setOvr((o) => ({ ...o, rendBrut: v }))} unit="%" step={0.1} />
                          </Field>
                          <Field label="Rendement net">
                            <NumInput value={ovr.rendNet} onChange={(v) => setOvr((o) => ({ ...o, rendNet: v }))} unit="%" step={0.1} />
                          </Field>
                          <Field label="Cashflow mensuel">
                            <NumInput value={ovr.cashflow} onChange={(v) => setOvr((o) => ({ ...o, cashflow: v }))} unit="€" />
                          </Field>
                          <Field label="Score">
                            <NumInput value={ovr.score} onChange={(v) => setOvr((o) => ({ ...o, score: Math.max(0, Math.min(100, v)) }))} unit="/100" />
                          </Field>
                        </motion.div>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-th-border flex items-center justify-between gap-3">
              <button
                onClick={() => (step === 0 ? close() : setStep((s) => s - 1))}
                className="text-sm font-semibold text-th-text-2 hover:text-th-text-1 px-4 py-2.5 rounded-xl border border-th-border hover:bg-th-surface2 transition-all"
              >
                {step === 0 ? 'Annuler' : 'Retour'}
              </button>
              {step < 3 ? (
                <button
                  onClick={() => (step === 2 ? goResults() : setStep((s) => s + 1))}
                  disabled={!canNext}
                  className="text-sm font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 px-6 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Continuer
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-sm font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 px-6 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {saving ? 'Enregistrement…' : 'Ajouter à mon patrimoine'}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
