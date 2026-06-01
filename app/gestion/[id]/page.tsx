'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app/AppShell'
import { useAuth } from '@/lib/hooks/useAuth'
import { useEntitlements } from '@/lib/hooks/useEntitlements'
import { useToast } from '@/components/ui/Toast'
import {
  getBien, listBaux, listLocataires, listLoyers, listTravaux, listCharges, listDocuments,
  createBail, updateBail, createLocataire, insertLoyers, updateLoyer,
  createTravail, updateTravail, deleteTravail, createCharge, deleteCharge,
  createDocument, deleteDocument, uploadGestionDoc, getSignedDocUrl,
  updateBien,
} from '@/lib/gestion-db'
import {
  formatEuro, formatDateFR, moisLabel, todayISO, addMonthsISO,
  genererEcheances, statutLoyer, resteADu, calculerRevisionIRL, bilanFoncier,
  STATUT_LOYER_META, STATUT_TRAVAUX_META, TYPE_BAIL_OPTIONS,
  CATEGORIE_TRAVAUX_OPTIONS, TYPE_CHARGE_OPTIONS, CATEGORIE_DOC_OPTIONS,
  type BienGestion, type Bail, type Locataire, type Loyer, type Travail, type Charge,
  type DocumentGED, type StatutTravaux, type TypeBail,
} from '@/lib/gestion'

const TONE: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  amber:   'bg-amber-500/10 text-amber-400 border-amber-500/25',
  red:     'bg-red-500/10 text-red-400 border-red-500/25',
  indigo:  'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
  zinc:    'bg-th-surface2 text-th-text-2 border-th-border',
}
const INPUT = 'w-full bg-th-input-bg border border-th-input-border rounded-xl px-3 py-2 text-sm text-th-text-1 placeholder:text-th-text-3 focus:border-emerald-500/50 outline-none transition-colors'
const LABEL = 'block text-[11px] font-semibold text-th-text-2 mb-1.5'
const CARD = 'rounded-2xl border border-th-border bg-th-surface'
const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold rounded-xl text-sm px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
const BTN_GHOST = 'inline-flex items-center justify-center gap-2 text-th-text-2 border border-th-border hover:bg-th-surface2 font-semibold rounded-xl text-sm px-4 py-2.5 transition-all'

type Tab = 'loyers' | 'bail' | 'travaux' | 'charges' | 'documents'

export default function GestionBienPage() {
  const params = useParams()
  const id = String(params?.id ?? '')
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { canManageRentals } = useEntitlements()
  const toast = useToast()

  const [bien, setBien] = useState<BienGestion | null>(null)
  const [baux, setBaux] = useState<Bail[]>([])
  const [locataires, setLocataires] = useState<Locataire[]>([])
  const [loyers, setLoyers] = useState<Loyer[]>([])
  const [travaux, setTravaux] = useState<Travail[]>([])
  const [charges, setCharges] = useState<Charge[]>([])
  const [documents, setDocuments] = useState<DocumentGED[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('loyers')

  const loadAll = useCallback(async () => {
    if (!user?.id || !id) return
    setLoading(true)
    const [b, bx, lc, ly, tv, ch, dc] = await Promise.all([
      getBien(id), listBaux(user.id, id), listLocataires(user.id, id), listLoyers(user.id, id),
      listTravaux(user.id, id), listCharges(user.id, id), listDocuments(user.id, id),
    ])
    setBien(b); setBaux(bx); setLocataires(lc); setLoyers(ly); setTravaux(tv); setCharges(ch); setDocuments(dc)
    setLoading(false)
  }, [user?.id, id])

  useEffect(() => { if (user?.id) loadAll() }, [user?.id, loadAll])

  const bailActif = useMemo(() => baux.find(b => b.actif) ?? null, [baux])

  if (authLoading || loading) {
    return <AppShell><div className="flex items-center justify-center min-h-[60vh]"><div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div></AppShell>
  }
  if (!canManageRentals) {
    return <AppShell><div className="px-6 py-20 text-center text-th-text-2">Module réservé au plan Pro. <Link href="/gestion" className="text-emerald-400">Retour</Link></div></AppShell>
  }
  if (!bien) {
    return <AppShell><div className="px-6 py-20 text-center"><p className="text-th-text-1 font-bold mb-2">Bien introuvable</p><Link href="/gestion" className="text-emerald-400 text-sm">← Retour à la gestion</Link></div></AppShell>
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'loyers', label: 'Loyers & quittances', count: loyers.length || undefined },
    { id: 'bail', label: 'Bail & locataire' },
    { id: 'travaux', label: 'Travaux', count: travaux.length || undefined },
    { id: 'charges', label: 'Charges & fiscal', count: charges.length || undefined },
    { id: 'documents', label: 'Documents', count: documents.length || undefined },
  ]

  return (
    <AppShell>
      <div className="px-4 sm:px-6 md:px-8 py-8 lg:py-10 max-w-5xl">

        {/* Back + header */}
        <Link href="/gestion" className="inline-flex items-center gap-1.5 text-[12px] text-th-text-3 hover:text-th-text-1 transition-colors mb-4">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Gestion locative
        </Link>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-th-text-1 truncate" style={{ letterSpacing: '-0.04em' }}>{bien.label}</h1>
            <p className="text-sm text-th-text-2 mt-1">
              {[bien.adresse, bien.code_postal, bien.ville].filter(Boolean).join(', ') || '—'}
              {bien.surface ? ` · ${bien.surface} m²` : ''}{bien.dpe ? ` · DPE ${bien.dpe}` : ''}
            </p>
          </div>
          <StatutBienSelect bien={bien} onChange={async (s) => { await updateBien(bien.id, { statut: s }); setBien({ ...bien, statut: s }) }} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-th-border mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`relative px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${tab === t.id ? 'text-th-text-1' : 'text-th-text-3 hover:text-th-text-2'}`}>
              {t.label}{t.count ? <span className="ml-1.5 text-[10px] tabular-nums opacity-60">{t.count}</span> : ''}
              {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
            </button>
          ))}
        </div>

        {tab === 'loyers'    && <LoyersTab userId={user!.id} bienId={id} bail={bailActif} loyers={loyers} reload={loadAll} toast={toast} />}
        {tab === 'bail'      && <BailTab userId={user!.id} bienId={id} bail={bailActif} locataires={locataires} reload={loadAll} toast={toast} onBailCreated={() => setTab('loyers')} setBienStatut={(s) => setBien(bien ? { ...bien, statut: s } : bien)} />}
        {tab === 'travaux'   && <TravauxTab userId={user!.id} bienId={id} travaux={travaux} reload={loadAll} toast={toast} />}
        {tab === 'charges'   && <ChargesTab userId={user!.id} bienId={id} charges={charges} loyers={loyers} travaux={travaux} reload={loadAll} toast={toast} />}
        {tab === 'documents' && <DocumentsTab userId={user!.id} bienId={id} documents={documents} reload={loadAll} toast={toast} />}
      </div>
    </AppShell>
  )
}

type ToastApi = { success: (m: string) => void; error: (m: string) => void }

// ─── Statut bien select ───────────────────────────────────────────────────────
function StatutBienSelect({ bien, onChange }: { bien: BienGestion; onChange: (s: BienGestion['statut']) => void }) {
  return (
    <select value={bien.statut} onChange={e => onChange(e.target.value as BienGestion['statut'])}
      className="shrink-0 bg-th-input-bg border border-th-input-border rounded-xl px-3 py-2 text-sm font-semibold text-th-text-1 outline-none focus:border-emerald-500/50">
      <option value="vacant">Vacant</option>
      <option value="loue">Loué</option>
      <option value="travaux">En travaux</option>
    </select>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// LOYERS
// ════════════════════════════════════════════════════════════════════════════
function LoyersTab({ userId, bienId, bail, loyers, reload, toast }: {
  userId: string; bienId: string; bail: Bail | null; loyers: Loyer[]; reload: () => Promise<void>; toast: ToastApi
}) {
  const [busy, setBusy] = useState(false)

  if (!bail) {
    return <EmptyHint title="Aucun bail actif" text="Créez d'abord un bail dans l'onglet « Bail & locataire » pour générer l'échéancier des loyers." />
  }

  const sorted = [...loyers].sort((a, b) => (a.periode < b.periode ? 1 : -1))

  async function genererEcheancier() {
    if (!bail) return
    setBusy(true)
    const drafts = genererEcheances(bail, todayISO(), loyers.map(l => l.periode))
    if (drafts.length === 0) { toast.success('Échéancier déjà à jour'); setBusy(false); return }
    const rows = drafts.map(d => ({
      user_id: userId, bien_id: bienId, bail_id: bail.id,
      periode: d.periode, montant_loyer: d.montant_loyer, montant_charges: d.montant_charges,
      montant_du: d.montant_du, date_echeance: d.date_echeance, statut: 'a_venir' as const,
    }))
    const r = await insertLoyers(rows)
    if (r.error) toast.error(r.error); else toast.success(`${rows.length} échéance${rows.length > 1 ? 's' : ''} générée${rows.length > 1 ? 's' : ''}`)
    await reload(); setBusy(false)
  }

  async function marquerPaye(l: Loyer) {
    await updateLoyer(l.id, { montant_paye: l.montant_du, date_paiement: todayISO(), statut: 'paye' })
    await reload()
  }
  async function annulerPaye(l: Loyer) {
    await updateLoyer(l.id, { montant_paye: 0, date_paiement: null, statut: 'a_venir' })
    await reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-th-text-2">Loyer mensuel : <span className="font-bold text-th-text-1">{formatEuro(bail.loyer_hc + bail.charges_provision)}</span> CC <span className="text-th-text-3">({formatEuro(bail.loyer_hc)} HC + {formatEuro(bail.charges_provision)} ch.)</span></p>
        <button onClick={genererEcheancier} disabled={busy} className={BTN_PRIMARY}>
          {busy ? 'Génération…' : "Générer l'échéancier"}
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyHint title="Aucune échéance" text="Cliquez sur « Générer l'échéancier » pour créer les quittances depuis le début du bail jusqu'à ce mois-ci." />
      ) : (
        <div className={`${CARD} overflow-hidden`}>
          <div className="divide-y divide-th-border">
            {sorted.map(l => {
              const st = statutLoyer(l.montant_du, l.montant_paye, l.date_echeance)
              const meta = STATUT_LOYER_META[st]
              return (
                <div key={l.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-th-text-1 capitalize">{moisLabel(l.periode)}</p>
                    <p className="text-[11px] text-th-text-3">Échéance {formatDateFR(l.date_echeance)} · {formatEuro(l.montant_du)}{st === 'partiel' ? ` · payé ${formatEuro(l.montant_paye)}` : ''}{st === 'retard' ? ` · ${formatEuro(resteADu(l))} dû` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${TONE[meta.tone]}`}>{meta.label}</span>
                    {st === 'paye'
                      ? <button onClick={() => annulerPaye(l)} className="text-[11px] font-semibold text-th-text-3 hover:text-th-text-1">Annuler</button>
                      : <button onClick={() => marquerPaye(l)} className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300">Marquer payé</button>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <p className="text-[11px] text-th-text-3">Génération automatique de la quittance PDF et envoi par email : prochaine étape.</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// BAIL & LOCATAIRE
// ════════════════════════════════════════════════════════════════════════════
function BailTab({ userId, bienId, bail, locataires, reload, toast, onBailCreated, setBienStatut }: {
  userId: string; bienId: string; bail: Bail | null; locataires: Locataire[]
  reload: () => Promise<void>; toast: ToastApi; onBailCreated: () => void; setBienStatut: (s: BienGestion['statut']) => void
}) {
  const locataire = useMemo(() => locataires.find(l => l.id === bail?.locataire_id) ?? null, [locataires, bail])

  if (bail) return <BailView bail={bail} locataire={locataire} reload={reload} toast={toast} />
  return <BailForm userId={userId} bienId={bienId} reload={reload} toast={toast} onCreated={() => { setBienStatut('loue'); onBailCreated() }} />
}

function BailView({ bail, locataire, reload, toast }: { bail: Bail; locataire: Locataire | null; reload: () => Promise<void>; toast: ToastApi }) {
  const [irlBase, setIrlBase] = useState(bail.irl_indice_base ? String(bail.irl_indice_base) : '')
  const [irlNew, setIrlNew] = useState('')
  const rev = useMemo(() => {
    const b = Number(irlBase), n = Number(irlNew)
    return b > 0 && n > 0 ? calculerRevisionIRL(bail.loyer_hc, b, n) : null
  }, [irlBase, irlNew, bail.loyer_hc])

  async function appliquerRevision() {
    if (!rev) return
    const r = await updateBail(bail.id, {
      loyer_hc: rev.nouveauLoyer, irl_indice_base: Number(irlNew),
      date_revision: addMonthsISO(todayISO(), 12),
    })
    if (r.error) toast.error(r.error); else { toast.success('Loyer révisé ✓'); await reload() }
  }

  const info: [string, string][] = [
    ['Type de bail', TYPE_BAIL_OPTIONS.find(o => o.value === bail.type_bail)?.label ?? bail.type_bail],
    ['Début', formatDateFR(bail.date_debut)],
    ['Durée', `${bail.duree_mois} mois`],
    ['Loyer HC', formatEuro(bail.loyer_hc)],
    ['Provision charges', formatEuro(bail.charges_provision)],
    ['Dépôt de garantie', formatEuro(bail.depot_garantie)],
    ['Jour de paiement', `le ${bail.jour_paiement}`],
    ['Locataire', locataire ? `${locataire.prenom ?? ''} ${locataire.nom}`.trim() : '—'],
  ]

  return (
    <div className="space-y-4">
      <div className={`${CARD} p-5`}>
        <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-widest mb-4">Bail en cours</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {info.map(([k, v]) => (
            <div key={k}><p className="text-[10px] text-th-text-3 mb-0.5">{k}</p><p className="text-[13px] font-semibold text-th-text-1">{v}</p></div>
          ))}
        </div>
      </div>

      {/* Révision IRL */}
      <div className={`${CARD} p-5`}>
        <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-widest mb-1">Révision du loyer (IRL)</p>
        <p className="text-[12px] text-th-text-3 mb-4">Formule légale : nouveau loyer = loyer actuel × (nouvel IRL ÷ IRL de référence du bail).</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className={LABEL}>IRL de référence (au bail)</label><input type="number" step="0.01" value={irlBase} onChange={e => setIrlBase(e.target.value)} placeholder="ex : 142,06" className={INPUT} /></div>
          <div><label className={LABEL}>Nouvel IRL (INSEE)</label><input type="number" step="0.01" value={irlNew} onChange={e => setIrlNew(e.target.value)} placeholder="ex : 145,17" className={INPUT} /></div>
        </div>
        {rev && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 px-4 py-3">
            <div>
              <p className="text-[13px] text-th-text-1">Nouveau loyer HC : <span className="font-bold text-emerald-400">{formatEuro(rev.nouveauLoyer)}</span></p>
              <p className="text-[11px] text-th-text-3">+{formatEuro(rev.augmentationMensuelle)}/mois · +{rev.augmentationPct}%</p>
            </div>
            <button onClick={appliquerRevision} className={BTN_PRIMARY}>Appliquer</button>
          </div>
        )}
      </div>
    </div>
  )
}

function BailForm({ userId, bienId, reload, toast, onCreated }: { userId: string; bienId: string; reload: () => Promise<void>; toast: ToastApi; onCreated: () => void }) {
  const [typeBail, setTypeBail] = useState<TypeBail>('nu')
  const [dateDebut, setDateDebut] = useState(todayISO())
  const [duree, setDuree] = useState('36')
  const [loyer, setLoyer] = useState('')
  const [charges, setCharges] = useState('')
  const [depot, setDepot] = useState('')
  const [jour, setJour] = useState('1')
  const [irlBase, setIrlBase] = useState('')
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [tel, setTel] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!loyer || saving) return
    setSaving(true)
    let locataireId: string | null = null
    if (nom.trim()) {
      const lc = await createLocataire({ user_id: userId, bien_id: bienId, nom: nom.trim(), prenom: prenom.trim() || null, email: email.trim() || null, telephone: tel.trim() || null })
      locataireId = lc.data?.id ?? null
    }
    const dureeN = Number(duree) || 36
    const r = await createBail({
      user_id: userId, bien_id: bienId, locataire_id: locataireId, type_bail: typeBail,
      date_debut: dateDebut, duree_mois: dureeN, date_fin: addMonthsISO(dateDebut, dureeN),
      loyer_hc: Number(loyer), charges_provision: Number(charges) || 0, depot_garantie: Number(depot) || 0,
      jour_paiement: Math.min(31, Math.max(1, Number(jour) || 1)),
      irl_indice_base: irlBase ? Number(irlBase) : null, date_revision: addMonthsISO(dateDebut, 12), actif: true,
    })
    if (r.error) { toast.error(r.error); setSaving(false); return }
    await updateBien(bienId, { statut: 'loue' })
    toast.success('Bail créé ✓')
    await reload()
    setSaving(false)
    onCreated()
  }

  return (
    <div className={`${CARD} p-5`}>
      <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-widest mb-4">Nouveau bail</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div><label className={LABEL}>Type de bail</label><select value={typeBail} onChange={e => setTypeBail(e.target.value as TypeBail)} className={INPUT}>{TYPE_BAIL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div><label className={LABEL}>Date de début</label><input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className={INPUT} /></div>
        <div><label className={LABEL}>Durée (mois)</label><input type="number" value={duree} onChange={e => setDuree(e.target.value)} className={INPUT} /></div>
        <div><label className={LABEL}>Loyer HC (€/mois) *</label><input type="number" value={loyer} onChange={e => setLoyer(e.target.value)} className={INPUT} /></div>
        <div><label className={LABEL}>Charges (€/mois)</label><input type="number" value={charges} onChange={e => setCharges(e.target.value)} className={INPUT} /></div>
        <div><label className={LABEL}>Dépôt de garantie (€)</label><input type="number" value={depot} onChange={e => setDepot(e.target.value)} className={INPUT} /></div>
        <div><label className={LABEL}>Jour de paiement</label><input type="number" min="1" max="31" value={jour} onChange={e => setJour(e.target.value)} className={INPUT} /></div>
        <div><label className={LABEL}>IRL de référence</label><input type="number" step="0.01" value={irlBase} onChange={e => setIrlBase(e.target.value)} placeholder="ex : 142,06" className={INPUT} /></div>
      </div>
      <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-widest mb-3">Locataire (optionnel)</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div><label className={LABEL}>Nom</label><input value={nom} onChange={e => setNom(e.target.value)} className={INPUT} /></div>
        <div><label className={LABEL}>Prénom</label><input value={prenom} onChange={e => setPrenom(e.target.value)} className={INPUT} /></div>
        <div><label className={LABEL}>Email</label><input value={email} onChange={e => setEmail(e.target.value)} className={INPUT} /></div>
        <div><label className={LABEL}>Téléphone</label><input value={tel} onChange={e => setTel(e.target.value)} className={INPUT} /></div>
      </div>
      <button onClick={submit} disabled={!loyer || saving} className={BTN_PRIMARY}>{saving ? 'Création…' : 'Créer le bail'}</button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TRAVAUX
// ════════════════════════════════════════════════════════════════════════════
function TravauxTab({ userId, bienId, travaux, reload, toast }: { userId: string; bienId: string; travaux: Travail[]; reload: () => Promise<void>; toast: ToastApi }) {
  const [open, setOpen] = useState(false)
  const [titre, setTitre] = useState('')
  const [cat, setCat] = useState('autre')
  const [statut, setStatut] = useState<StatutTravaux>('a_faire')
  const [estime, setEstime] = useState('')
  const [reel, setReel] = useState('')
  const [deductible, setDeductible] = useState(true)
  const [saving, setSaving] = useState(false)

  const totalEstime = travaux.reduce((s, t) => s + (t.cout_estime || 0), 0)
  const totalReel = travaux.reduce((s, t) => s + (t.cout_reel || 0), 0)

  async function add() {
    if (!titre.trim() || saving) return
    setSaving(true)
    const r = await createTravail({ user_id: userId, bien_id: bienId, titre: titre.trim(), categorie: cat, statut, cout_estime: Number(estime) || 0, cout_reel: Number(reel) || 0, deductible })
    if (r.error) toast.error(r.error); else { toast.success('Travaux ajoutés ✓'); setTitre(''); setEstime(''); setReel(''); setOpen(false); await reload() }
    setSaving(false)
  }
  async function cycleStatut(t: Travail) {
    const order: StatutTravaux[] = ['a_faire', 'devis', 'en_cours', 'termine']
    const next = order[(order.indexOf(t.statut) + 1) % order.length]
    await updateTravail(t.id, { statut: next }); await reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-th-text-2">Budget : <span className="font-bold text-th-text-1">{formatEuro(totalReel || totalEstime)}</span> {totalReel > 0 && totalEstime > 0 ? <span className="text-th-text-3">(estimé {formatEuro(totalEstime)})</span> : null}</p>
        <button onClick={() => setOpen(v => !v)} className={open ? BTN_GHOST : BTN_PRIMARY}>{open ? 'Fermer' : '+ Ajouter'}</button>
      </div>

      {open && (
        <div className={`${CARD} p-5 grid grid-cols-2 sm:grid-cols-3 gap-3`}>
          <div className="col-span-2 sm:col-span-3"><label className={LABEL}>Intitulé *</label><input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex : Réfection cuisine" className={INPUT} /></div>
          <div><label className={LABEL}>Catégorie</label><select value={cat} onChange={e => setCat(e.target.value)} className={INPUT}>{CATEGORIE_TRAVAUX_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div><label className={LABEL}>Statut</label><select value={statut} onChange={e => setStatut(e.target.value as StatutTravaux)} className={INPUT}><option value="a_faire">À faire</option><option value="devis">Devis</option><option value="en_cours">En cours</option><option value="termine">Terminé</option></select></div>
          <div><label className={LABEL}>Coût estimé (€)</label><input type="number" value={estime} onChange={e => setEstime(e.target.value)} className={INPUT} /></div>
          <div><label className={LABEL}>Coût réel (€)</label><input type="number" value={reel} onChange={e => setReel(e.target.value)} className={INPUT} /></div>
          <label className="flex items-end gap-2 pb-2 text-[12px] text-th-text-2"><input type="checkbox" checked={deductible} onChange={e => setDeductible(e.target.checked)} className="accent-emerald-500" /> Déductible</label>
          <div className="flex items-end"><button onClick={add} disabled={!titre.trim() || saving} className={BTN_PRIMARY + ' w-full'}>{saving ? '…' : 'Ajouter'}</button></div>
        </div>
      )}

      {travaux.length === 0 ? <EmptyHint title="Aucun travaux" text="Suivez ici vos travaux : devis, budget estimé vs réel, déductibilité fiscale." /> : (
        <div className={`${CARD} overflow-hidden divide-y divide-th-border`}>
          {travaux.map(t => {
            const meta = STATUT_TRAVAUX_META[t.statut]
            return (
              <div key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-th-text-1 truncate">{t.titre}</p>
                  <p className="text-[11px] text-th-text-3">{CATEGORIE_TRAVAUX_OPTIONS.find(o => o.value === t.categorie)?.label ?? t.categorie}{t.deductible ? ' · déductible' : ''}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[13px] font-bold text-th-text-1 tabular-nums">{formatEuro(t.cout_reel || t.cout_estime)}</span>
                  <button onClick={() => cycleStatut(t)} className={`text-[10px] font-bold px-2 py-1 rounded-md border ${TONE[meta.tone]}`}>{meta.label}</button>
                  <button onClick={async () => { await deleteTravail(t.id); await reload() }} className="text-th-text-3 hover:text-red-400"><TrashIcon /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// CHARGES & FISCAL
// ════════════════════════════════════════════════════════════════════════════
function ChargesTab({ userId, bienId, charges, loyers, travaux, reload, toast }: {
  userId: string; bienId: string; charges: Charge[]; loyers: Loyer[]; travaux: Travail[]; reload: () => Promise<void>; toast: ToastApi
}) {
  const annee = new Date().getFullYear()
  const [type, setType] = useState('taxe_fonciere')
  const [montant, setMontant] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)

  const bilan = useMemo(() => {
    const ly = loyers.filter(l => l.periode.startsWith(String(annee)))
    const ch = charges.filter(c => c.date.startsWith(String(annee)))
    const tv = travaux.filter(t => t.date_realisee?.startsWith(String(annee)) || (!t.date_realisee && t.statut === 'termine'))
    return bilanFoncier(annee, ly, ch, tv)
  }, [loyers, charges, travaux, annee])

  async function add() {
    if (!montant || saving) return
    setSaving(true)
    const opt = TYPE_CHARGE_OPTIONS.find(o => o.value === type)
    const r = await createCharge({ user_id: userId, bien_id: bienId, type, libelle: opt?.label ?? null, montant: Number(montant), date, deductible: opt?.deductible ?? true, recuperable: opt?.recuperable ?? false })
    if (r.error) toast.error(r.error); else { toast.success('Charge ajoutée ✓'); setMontant(''); await reload() }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {/* Add */}
      <div className={`${CARD} p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 items-end`}>
        <div className="col-span-2"><label className={LABEL}>Type de charge</label><select value={type} onChange={e => setType(e.target.value)} className={INPUT}>{TYPE_CHARGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div><label className={LABEL}>Montant (€)</label><input type="number" value={montant} onChange={e => setMontant(e.target.value)} className={INPUT} /></div>
        <div><label className={LABEL}>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT} /></div>
        <div className="col-span-2 sm:col-span-4"><button onClick={add} disabled={!montant || saving} className={BTN_PRIMARY}>{saving ? '…' : '+ Ajouter la charge'}</button></div>
      </div>

      {/* Bilan fiscal */}
      <div className={`${CARD} p-5`}>
        <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-widest mb-4">Prépa déclaration {annee} — revenus fonciers</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <Stat label="Recettes encaissées" value={formatEuro(bilan.recettes)} color="#34d399" />
          <Stat label="Charges déductibles" value={formatEuro(bilan.totalDeductible)} color="#fbbf24" />
          <Stat label="Résultat (réel)" value={formatEuro(bilan.resultatReel)} color={bilan.resultatReel >= 0 ? 'var(--c-text-1)' : '#f87171'} />
          <Stat label="Régime conseillé" value={bilan.regimeConseille === 'micro-foncier' ? 'Micro-foncier' : 'Réel'} />
        </div>
        {bilan.microFoncierEligible && (
          <p className="text-[11px] text-th-text-3">Micro-foncier éligible (recettes ≤ 15 000 €) : base imposable = {formatEuro(bilan.resultatMicro)} après abattement 30 %.</p>
        )}
        <p className="text-[11px] text-th-text-3 mt-1">Estimation indicative pour la location nue (2044). Le meublé (BIC) est géré dans l'analyse fiscale du calculateur.</p>
      </div>

      {charges.length === 0 ? <EmptyHint title="Aucune charge" text="Saisissez vos charges (taxe foncière, copro, assurance, intérêts…) pour préparer votre déclaration." /> : (
        <div className={`${CARD} overflow-hidden divide-y divide-th-border`}>
          {charges.map(c => (
            <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-th-text-1">{c.libelle ?? TYPE_CHARGE_OPTIONS.find(o => o.value === c.type)?.label ?? c.type}</p>
                <p className="text-[11px] text-th-text-3">{formatDateFR(c.date)}{c.deductible ? ' · déductible' : ''}{c.recuperable ? ' · récupérable' : ''}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[13px] font-bold text-th-text-1 tabular-nums">{formatEuro(c.montant)}</span>
                <button onClick={async () => { await deleteCharge(c.id); await reload() }} className="text-th-text-3 hover:text-red-400"><TrashIcon /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENTS
// ════════════════════════════════════════════════════════════════════════════
function DocumentsTab({ userId, bienId, documents, reload, toast }: { userId: string; bienId: string; documents: DocumentGED[]; reload: () => Promise<void>; toast: ToastApi }) {
  const [cat, setCat] = useState('autre')
  const [uploading, setUploading] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const up = await uploadGestionDoc(userId, bienId, file)
    if (up.error || !up.path) { toast.error(up.error ?? 'Erreur upload'); setUploading(false); return }
    const r = await createDocument({ user_id: userId, bien_id: bienId, categorie: cat, nom: file.name, url: up.path, taille_octets: file.size, mime: file.type })
    if (r.error) toast.error(r.error); else { toast.success('Document ajouté ✓'); await reload() }
    setUploading(false)
    e.target.value = ''
  }
  async function ouvrir(d: DocumentGED) {
    const url = await getSignedDocUrl(d.url)
    if (url) window.open(url, '_blank', 'noopener'); else toast.error('Lien indisponible')
  }

  return (
    <div className="space-y-4">
      <div className={`${CARD} p-5 flex items-end gap-3 flex-wrap`}>
        <div className="flex-1 min-w-[160px]"><label className={LABEL}>Catégorie</label><select value={cat} onChange={e => setCat(e.target.value)} className={INPUT}>{CATEGORIE_DOC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <label className={BTN_PRIMARY + ' cursor-pointer'}>
          {uploading ? 'Envoi…' : 'Téléverser un document'}
          <input type="file" className="hidden" onChange={onFile} disabled={uploading} />
        </label>
      </div>

      {documents.length === 0 ? <EmptyHint title="Aucun document" text="Centralisez ici les baux, quittances, états des lieux, DPE, diagnostics, factures et assurances." /> : (
        <div className={`${CARD} overflow-hidden divide-y divide-th-border`}>
          {documents.map(d => (
            <div key={d.id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-th-text-1 truncate">{d.nom}</p>
                <p className="text-[11px] text-th-text-3">{CATEGORIE_DOC_OPTIONS.find(o => o.value === d.categorie)?.label ?? d.categorie}{d.taille_octets ? ` · ${Math.round(d.taille_octets / 1024)} Ko` : ''}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => ouvrir(d)} className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300">Ouvrir</button>
                <button onClick={async () => { await deleteDocument(d.id, d.url); await reload() }} className="text-th-text-3 hover:text-red-400"><TrashIcon /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Petits composants partagés ───────────────────────────────────────────────
function EmptyHint({ title, text }: { title: string; text: string }) {
  return (
    <div className={`${CARD} px-6 py-12 text-center`}>
      <p className="text-sm font-bold text-th-text-1 mb-1">{title}</p>
      <p className="text-xs text-th-text-2 max-w-sm mx-auto">{text}</p>
    </div>
  )
}
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return <div><p className="text-[10px] text-th-text-3 mb-0.5">{label}</p><p className="text-[15px] font-bold tabular-nums" style={{ color: color ?? 'var(--c-text-1)' }}>{value}</p></div>
}
function TrashIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
}
