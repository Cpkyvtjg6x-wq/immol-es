'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { InvestmentParams } from '@/lib/types'
import { DEFAULT_PARAMS } from '@/lib/calculator'
import { VILLES } from '@/lib/market-data'

interface AdvancedFormProps {
  onCalculate: (params: Partial<InvestmentParams>, tmi: number) => void
  loading: boolean
}

const villeOptions = Object.keys(VILLES).map((v) => ({ value: v, label: v }))

const typeBienOptions = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'maison', label: 'Maison' },
  { value: 'studio', label: 'Studio' },
  { value: 'immeuble', label: 'Immeuble de rapport' },
  { value: 'parking', label: 'Parking / Box' },
  { value: 'local-commercial', label: 'Local commercial' },
]

const locTypeOptions = [
  { value: 'nu', label: 'Location nue' },
  { value: 'meuble', label: 'Location meublée (LMNP)' },
  { value: 'coloc', label: 'Colocation' },
  { value: 'saisonnier', label: 'Saisonnier / Airbnb' },
]

const loanTypeOptions = [
  { value: 'amortissable', label: 'Prêt amortissable (classique)' },
  { value: 'in-fine', label: 'Prêt in fine' },
]

const tmiOptions = [
  { value: '0', label: '0% — Non imposable' },
  { value: '11', label: '11% — Tranche 1' },
  { value: '30', label: '30% — Tranche 2' },
  { value: '41', label: '41% — Tranche 3' },
  { value: '45', label: '45% — Tranche 4' },
]

function Section({
  step, title, children, collapsible = false,
}: {
  step: string; title: string; children: React.ReactNode; collapsible?: boolean
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className="flex items-center gap-2.5 w-full group"
      >
        <span className="w-4 h-4 rounded-full bg-th-surface2 border border-th-border flex items-center justify-center text-[10px] font-bold text-th-text-2 shrink-0">
          {step}
        </span>
        <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-widest flex-1 text-left">{title}</p>
        {collapsible && (
          <svg
            className={`w-3.5 h-3.5 text-th-text-3 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      {open && children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <span className="text-xs text-th-text-2">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-th-surface3'}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </button>
    </label>
  )
}

function Divider() {
  return <div className="h-px bg-th-surface2" />
}

export function AdvancedForm({ onCalculate, loading }: AdvancedFormProps) {
  const [tmi, setTmi] = useState(30)
  const [form, setForm] = useState({
    // Bien
    prixAchat: 200000,
    travaux: 0,
    surface: 45,
    ville: 'Lyon',
    typeBien: 'appartement',
    // Location
    locType: 'nu' as 'nu' | 'meuble' | 'coloc' | 'saisonnier',
    loyerNu: 950,
    loyerMeuble: 1050,
    vacance: 0.5,
    // Financement
    apport: 20000,
    taux: 3.8,
    duree: 20,
    loanType: 'amortissable' as 'amortissable' | 'in-fine',
    assuranceTaux: 0.1,
    fraisNotaire: 14000,
    fraisGarantiePct: 1.5,
    fraisDossier: 500,
    // PTZ
    ptzEnabled: false,
    ptzMontant: 0,
    ptzTaux: 0,
    ptzDuree: 15,
    // Charges
    taxeFonciere: 800,
    chargesCopro: 1200,
    assurancePno: 200,
    fraisGestionPct: 0,
    provisionPct: 5,
    gliPct: 0,
    cfe: 600,
    fraisComptable: 0,
  })

  const set = (field: string, value: string | number | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCalculate({ ...DEFAULT_PARAMS, ...form }, tmi)
  }

  const isLMNP = form.locType === 'meuble' || form.locType === 'saisonnier'

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* 1 — Le bien */}
      <Section step="1" title="Le bien">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" options={typeBienOptions} value={form.typeBien} onChange={(e) => set('typeBien', e.target.value)} />
            <Select label="Ville" options={villeOptions} value={form.ville} onChange={(e) => set('ville', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prix d'achat" type="number" value={form.prixAchat} suffix="€" onChange={(e) => set('prixAchat', +e.target.value)} />
            <Input label="Surface" type="number" value={form.surface} suffix="m²" onChange={(e) => set('surface', +e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Travaux" type="number" value={form.travaux} suffix="€" onChange={(e) => set('travaux', +e.target.value)} />
            <Input label="Frais de notaire" type="number" value={form.fraisNotaire} suffix="€" onChange={(e) => set('fraisNotaire', +e.target.value)} />
          </div>
        </div>
      </Section>

      <Divider />

      {/* 2 — Location */}
      <Section step="2" title="Location">
        <div className="space-y-3">
          <Select label="Type de location" options={locTypeOptions} value={form.locType} onChange={(e) => set('locType', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Loyer nu" type="number" value={form.loyerNu} suffix="€/mois" onChange={(e) => set('loyerNu', +e.target.value)} />
            <Input label="Loyer meublé" type="number" value={form.loyerMeuble} suffix="€/mois" onChange={(e) => set('loyerMeuble', +e.target.value)} />
          </div>
          {/* Vacance slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-th-text-1">Vacance locative</label>
              <span className="text-xs text-th-text-2 tabular-nums">{form.vacance} mois/an</span>
            </div>
            <input
              type="range" min={0} max={3} step={0.25} value={form.vacance}
              onChange={(e) => set('vacance', +e.target.value)}
            />
            <div className="flex justify-between text-[10px] text-th-text-3">
              <span>0 — Toujours loué</span>
              <span>3 mois vide</span>
            </div>
          </div>
        </div>
      </Section>

      <Divider />

      {/* 3 — Financement */}
      <Section step="3" title="Financement">
        <div className="space-y-3">
          <Select label="Type de prêt" options={loanTypeOptions} value={form.loanType} onChange={(e) => set('loanType', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Apport" type="number" value={form.apport} suffix="€" onChange={(e) => set('apport', +e.target.value)} />
            <Input label="Taux nominal" type="number" step="0.05" value={form.taux} suffix="%" onChange={(e) => set('taux', +e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Durée" type="number" value={form.duree} suffix="ans" onChange={(e) => set('duree', +e.target.value)} />
            <Input label="Assurance" type="number" step="0.01" value={form.assuranceTaux} suffix="% cap." onChange={(e) => set('assuranceTaux', +e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Garantie" type="number" step="0.1" value={form.fraisGarantiePct} suffix="% cap." onChange={(e) => set('fraisGarantiePct', +e.target.value)} />
            <Input label="Frais dossier" type="number" value={form.fraisDossier} suffix="€" onChange={(e) => set('fraisDossier', +e.target.value)} />
          </div>
        </div>
      </Section>

      <Divider />

      {/* 4 — PTZ */}
      <Section step="4" title="PTZ" collapsible>
        <div className="space-y-3">
          <Toggle label="Prêt à Taux Zéro activé" checked={form.ptzEnabled} onChange={(v) => set('ptzEnabled', v)} />
          {form.ptzEnabled && (
            <div className="space-y-3 pl-3 border-l border-th-border">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Montant PTZ" type="number" value={form.ptzMontant} suffix="€" onChange={(e) => set('ptzMontant', +e.target.value)} />
                <Input label="Taux PTZ" type="number" step="0.1" value={form.ptzTaux} suffix="%" onChange={(e) => set('ptzTaux', +e.target.value)} />
              </div>
              <Input label="Durée PTZ" type="number" value={form.ptzDuree} suffix="ans" onChange={(e) => set('ptzDuree', +e.target.value)} />
            </div>
          )}
        </div>
      </Section>

      <Divider />

      {/* 5 — Charges */}
      <Section step="5" title="Charges annuelles" collapsible>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Taxe foncière" type="number" value={form.taxeFonciere} suffix="€" onChange={(e) => set('taxeFonciere', +e.target.value)} />
            <Input label="Charges copro" type="number" value={form.chargesCopro} suffix="€" onChange={(e) => set('chargesCopro', +e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Assurance PNO" type="number" value={form.assurancePno} suffix="€" onChange={(e) => set('assurancePno', +e.target.value)} />
            <Input label="Frais de gestion" type="number" step="0.5" value={form.fraisGestionPct} suffix="%" onChange={(e) => set('fraisGestionPct', +e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Provision travaux" type="number" step="0.5" value={form.provisionPct} suffix="%" onChange={(e) => set('provisionPct', +e.target.value)} />
            <Input label="GLI" type="number" step="0.1" value={form.gliPct} suffix="%" onChange={(e) => set('gliPct', +e.target.value)} />
          </div>
          {(isLMNP || form.locType === 'coloc') && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="CFE" type="number" value={form.cfe} suffix="€/an" onChange={(e) => set('cfe', +e.target.value)} />
              <Input label="Comptable" type="number" value={form.fraisComptable} suffix="€/an" onChange={(e) => set('fraisComptable', +e.target.value)} />
            </div>
          )}
        </div>
      </Section>

      <Divider />

      {/* 6 — Fiscalité */}
      <Section step="6" title="Fiscalité">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-th-text-1">Tranche marginale d'imposition (TMI)</label>
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 11, 30, 41, 45].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTmi(t)}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                  tmi === t
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'bg-th-surface2 text-th-text-2 hover:bg-th-surface3 hover:text-th-text-1 border border-th-border'
                }`}
              >
                {t}%
              </button>
            ))}
          </div>
          <p className="text-[10px] text-th-text-3 pt-0.5">Permet le calcul nette-nette et la comparaison des 10 régimes fiscaux</p>
        </div>
      </Section>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50"
        style={{ background: '#10b981', color: '#022c22' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Calcul…
          </span>
        ) : 'Analyser (mode avancé)'}
      </button>
    </form>
  )
}
