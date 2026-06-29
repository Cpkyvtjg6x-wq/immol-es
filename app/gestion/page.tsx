'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app/AppShell'
import { useAuth } from '@/lib/hooks/useAuth'
import { useEntitlements } from '@/lib/hooks/useEntitlements'
import { useUpgrade } from '@/lib/upgrade-context'
import { useToast } from '@/components/ui/Toast'
import { useGestion } from '@/lib/hooks/useGestion'
import { useSimulations } from '@/lib/hooks/useSimulations'
import {
  formatEuro, moisLabel, statutLoyer, resteADu,
  STATUT_BIEN_META, TYPE_BIEN_OPTIONS,
  type StatutBien,
} from '@/lib/gestion'

// ─── Tones → classes Tailwind (cohérent avec la DA) ──────────────────────────
const TONE: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  amber:   'bg-amber-500/10 text-amber-400 border-amber-500/25',
  red:     'bg-red-500/10 text-red-400 border-red-500/25',
  indigo:  'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
  zinc:    'bg-th-surface2 text-th-text-2 border-th-border',
}

const INPUT = 'w-full bg-th-input-bg border border-th-input-border rounded-xl px-3 py-2 text-sm text-th-text-1 placeholder:text-th-text-3 focus:border-emerald-500/50 outline-none transition-colors'
const LABEL = 'block text-[11px] font-semibold text-th-text-2 mb-1.5'

function KeyIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 7a4 4 0 11-4 4m0 0L4 18m0 0v3h3m-3-3l2-2m4-4l3 3" />
    </svg>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL — Ajouter un bien (manuel ou depuis un bien détenu)
// ════════════════════════════════════════════════════════════════════════════

interface AddPayload {
  label: string; type_bien: string; adresse: string; ville: string; code_postal: string
  surface: number | null; prix_acquisition: number | null; date_acquisition: string | null
  dpe: string | null; statut: StatutBien; simulation_id: string | null
}

function AddBienModal({
  open, onClose, onSubmit, ownedSims,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (p: AddPayload) => Promise<void>
  ownedSims: { id: string; name: string; ville: string; prixAchat: number; surface: number }[]
}) {
  const [label, setLabel] = useState('')
  const [typeBien, setTypeBien] = useState('appartement')
  const [adresse, setAdresse] = useState('')
  const [ville, setVille] = useState('')
  const [cp, setCp] = useState('')
  const [surface, setSurface] = useState('')
  const [prix, setPrix] = useState('')
  const [dateAcq, setDateAcq] = useState('')
  const [dpe, setDpe] = useState('')
  const [statut, setStatut] = useState<StatutBien>('vacant')
  const [simId, setSimId] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  function prefill(id: string) {
    setSimId(id)
    const s = ownedSims.find(o => o.id === id)
    if (s) {
      setLabel(s.name); setVille(s.ville)
      if (s.prixAchat) setPrix(String(s.prixAchat))
      if (s.surface) setSurface(String(s.surface))
    }
  }

  async function submit() {
    if (!label.trim() || saving) return
    setSaving(true)
    await onSubmit({
      label: label.trim(), type_bien: typeBien, adresse: adresse.trim(), ville: ville.trim(),
      code_postal: cp.trim(), surface: surface ? Number(surface) : null,
      prix_acquisition: prix ? Number(prix) : null, date_acquisition: dateAcq || null,
      dpe: dpe || null, statut, simulation_id: simId || null,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-lg w-full max-h-[88vh] overflow-y-auto bg-th-surface border border-th-border rounded-2xl p-4 sm:p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-th-text-1" style={{ letterSpacing: '-0.02em' }}>Ajouter un bien à gérer</h2>
            <p className="text-xs text-th-text-2 mt-0.5">Saisie manuelle, ou pré-remplissage depuis un bien détenu.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-th-text-2 hover:text-th-text-1 hover:bg-th-surface2 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {ownedSims.length > 0 && (
          <div className="mb-4">
            <label className={LABEL}>Depuis un bien détenu (optionnel)</label>
            <select value={simId} onChange={e => prefill(e.target.value)} className={INPUT}>
              <option value="">— Saisie manuelle —</option>
              {ownedSims.map(o => <option key={o.id} value={o.id}>{o.name} · {o.ville}</option>)}
            </select>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className={LABEL}>Nom du bien *</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex : T2 Toulouse — Carmes" className={INPUT} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Type</label>
              <select value={typeBien} onChange={e => setTypeBien(e.target.value)} className={INPUT}>
                {TYPE_BIEN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Statut</label>
              <select value={statut} onChange={e => setStatut(e.target.value as StatutBien)} className={INPUT}>
                <option value="vacant">Vacant</option>
                <option value="loue">Loué</option>
                <option value="travaux">En travaux</option>
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>Adresse</label>
            <input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="12 rue de la Paix" className={INPUT} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Ville</label>
              <input value={ville} onChange={e => setVille(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Code postal</label>
              <input value={cp} onChange={e => setCp(e.target.value)} className={INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={LABEL}>Surface (m²)</label>
              <input type="number" value={surface} onChange={e => setSurface(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Prix d'acquisition</label>
              <input type="number" value={prix} onChange={e => setPrix(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>DPE</label>
              <select value={dpe} onChange={e => setDpe(e.target.value)} className={INPUT}>
                <option value="">—</option>
                {['A','B','C','D','E','F','G'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>Date d'acquisition</label>
            <input type="date" value={dateAcq} onChange={e => setDateAcq(e.target.value)} className={INPUT} />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-th-text-2 border border-th-border hover:bg-th-surface2 transition-all">Annuler</button>
          <button onClick={submit} disabled={!label.trim() || saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {saving ? 'Ajout…' : 'Ajouter le bien'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════════════════════════════════

export default function GestionPage() {
  const { user, loading: authLoading } = useAuth()
  const { canManageRentals } = useEntitlements()
  const { prompt: promptUpgrade } = useUpgrade()
  const toast = useToast()
  const { biens, baux, loyers, loading, stats, alertes, ajouterBien } = useGestion(user?.id ?? null)
  const { simulations } = useSimulations(user?.id ?? null)
  const [addOpen, setAddOpen] = useState(false)

  const ownedSims = useMemo(
    () => simulations.filter(s => s.status === 'possede').map(s => ({
      id: s.id, name: s.name, ville: s.ville, prixAchat: s.prixAchat,
      surface: (s.params.surface as number) ?? 0,
    })),
    [simulations],
  )

  // ── Loading ──
  if (authLoading || (loading && !!user)) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  // ── Gating Free ──
  if (!canManageRentals) {
    return (
      <AppShell>
        <div className="px-4 sm:px-6 md:px-8 py-8 lg:py-10">
          <div className="max-w-md mx-auto text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5 text-emerald-400">
              <KeyIcon className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-th-text-1 mb-2" style={{ letterSpacing: '-0.03em' }}>Gestion locative</h1>
            <p className="text-sm text-th-text-2 mb-6 leading-relaxed">
              Pilotez vos biens loués de A à Z : loyers et quittances, baux, révision IRL, suivi des travaux, charges et préparation de votre déclaration. Réservé au plan Pro.
            </p>
            <button onClick={() => promptUpgrade('gestion_locative')} className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold px-6 py-3 rounded-xl text-sm transition-all">
              Débloquer la gestion locative
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Helpers d'affichage par bien ──
  function bailActif(bienId: string) { return baux.find(b => b.bien_id === bienId && b.actif) }
  function prochainLoyer(bienId: string) {
    const impayes = loyers
      .filter(l => l.bien_id === bienId && statutLoyer(l.montant_du, l.montant_paye, l.date_echeance) !== 'paye')
      .sort((a, b) => (a.periode < b.periode ? -1 : 1))
    return impayes[0] ?? null
  }

  return (
    <AppShell>
      <div className="px-4 sm:px-6 md:px-8 py-8 lg:py-10">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">Gestion locative</p>
            <h1 className="text-2xl font-black text-th-text-1" style={{ letterSpacing: '-0.04em' }}>Mes biens en gestion</h1>
            <p className="text-sm text-th-text-2 mt-1">
              {stats.nbBiens > 0 ? `${stats.nbBiens} bien${stats.nbBiens > 1 ? 's' : ''} · ${stats.nbLoues} loué${stats.nbLoues > 1 ? 's' : ''}` : 'Pilotez vos loyers, baux, travaux et charges'}
            </p>
          </div>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 font-semibold px-4 py-2 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Ajouter un bien
          </button>
        </div>

        {biens.length === 0 ? (
          // ── Empty state ──
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-th-surface2 border border-th-border-med flex items-center justify-center mb-5 text-th-text-2">
              <KeyIcon className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-th-text-1 mb-2" style={{ letterSpacing: '-0.03em' }}>Aucun bien en gestion</h2>
            <p className="text-sm text-th-text-2 max-w-sm leading-relaxed mb-6">
              Ajoutez un bien que vous louez pour suivre ses loyers, son bail, ses travaux et ses charges — et préparer votre déclaration.
            </p>
            <button onClick={() => setAddOpen(true)} className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
              Ajouter mon premier bien →
            </button>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ── Dashboard KPIs ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <KpiCard label="Encaissé ce mois" value={formatEuro(stats.encaisseDuMois)} sub={`sur ${formatEuro(stats.loyersDuMois)} dû`} />
              <KpiCard label="Taux d'occupation" value={`${stats.tauxOccupation}%`} sub={`${stats.nbLoues}/${stats.nbBiens} loués`} color={stats.tauxOccupation >= 80 ? '#10b981' : '#f59e0b'} />
              <KpiCard label="Impayés" value={formatEuro(stats.impayesTotal)} sub={stats.nbImpayes > 0 ? `${stats.nbImpayes} en retard` : 'à jour'} color={stats.impayesTotal > 0 ? '#ef4444' : '#10b981'} />
              <KpiCard label="Revenus année" value={formatEuro(stats.revenusAnnee)} sub="loyers encaissés" color="#34d399" />
              <KpiCard label="Biens gérés" value={String(stats.nbBiens)} sub="portefeuille" />
            </div>

            {/* ── Alertes ── */}
            {alertes.length > 0 && (
              <div className="rounded-2xl border border-th-border bg-th-surface overflow-hidden">
                <div className="px-5 py-3 border-b border-th-border flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.85-2.77L13.85 4.78a2 2 0 00-3.7 0L3.15 16.23A2 2 0 005 19z" /></svg>
                  <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-widest">À traiter ({alertes.length})</p>
                </div>
                <div className="divide-y divide-th-border">
                  {alertes.slice(0, 8).map((a, i) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-3">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <p className="text-[13px] text-th-text-1">{a.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Grille des biens ── */}
            <div>
              <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-widest mb-3">Mes biens</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {biens.map(bien => {
                  const meta = STATUT_BIEN_META[bien.statut]
                  const bail = bailActif(bien.id)
                  const loyerMensuel = bail ? bail.loyer_hc + bail.charges_provision : null
                  const next = prochainLoyer(bien.id)
                  const nextStatut = next ? statutLoyer(next.montant_du, next.montant_paye, next.date_echeance) : null
                  return (
                    <Link key={bien.id} href={`/gestion/${bien.id}`} className="group rounded-2xl border border-th-border bg-th-surface p-5 hover:border-th-border-med transition-all hover:scale-[1.01]">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-th-text-1 truncate group-hover:text-emerald-400 transition-colors">{bien.label}</p>
                          <p className="text-[11px] text-th-text-3 truncate">{[bien.ville, bien.code_postal].filter(Boolean).join(' ') || bien.type_bien}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-md border ${TONE[meta.tone]}`}>{meta.label}</span>
                      </div>
                      <div className="flex items-end justify-between gap-3 pt-3 border-t border-th-border">
                        <div>
                          <p className="text-[10px] text-th-text-3 mb-0.5">Loyer CC</p>
                          <p className="text-[15px] font-bold text-th-text-1 tabular-nums">{loyerMensuel != null ? formatEuro(loyerMensuel) : '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-th-text-3 mb-0.5">Prochaine échéance</p>
                          {next && nextStatut ? (
                            <p className={`text-[12px] font-semibold ${nextStatut === 'retard' ? 'text-red-400' : 'text-th-text-2'}`}>
                              {moisLabel(next.periode)}{nextStatut === 'retard' ? ` · ${formatEuro(resteADu(next))} dû` : ''}
                            </p>
                          ) : (
                            <p className="text-[12px] font-semibold text-emerald-400">{bail ? 'À jour' : 'Pas de bail'}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <AddBienModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        ownedSims={ownedSims}
        onSubmit={async (p) => {
          if (!user?.id) return
          const r = await ajouterBien({ user_id: user.id, ...p })
          if (r.error) toast.error(r.error)
          else { toast.success('Bien ajouté ✓'); setAddOpen(false) }
        }}
      />
    </AppShell>
  )
}

// ─── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-th-border bg-th-surface p-5 flex flex-col gap-2">
      <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold tabular-nums leading-none" style={{ letterSpacing: '-0.04em', color: color ?? 'var(--c-text-1)' }}>{value}</p>
      {sub && <p className="text-[11px] text-th-text-3">{sub}</p>}
    </div>
  )
}
