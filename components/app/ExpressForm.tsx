'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { InvestmentParams } from '@/lib/types'
import { DEFAULT_PARAMS } from '@/lib/calculator'
import { VILLES } from '@/lib/market-data'

interface ExpressFormProps {
  onCalculate: (params: Partial<InvestmentParams>) => void
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
  { value: 'meuble', label: 'Location meublée' },
  { value: 'coloc', label: 'Colocation' },
  { value: 'saisonnier', label: 'Saisonnier / Airbnb' },
]

function FormSection({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="w-4 h-4 rounded-full bg-th-surface2 border border-th-border flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">
          {step}
        </span>
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">{title}</p>
      </div>
      {children}
    </div>
  )
}

export function ExpressForm({ onCalculate, loading }: ExpressFormProps) {
  const [form, setForm] = useState({
    prixAchat: 200000,
    travaux: 0,
    apport: 20000,
    loyerNu: 950,
    surface: 45,
    ville: 'Lyon',
    typeBien: 'appartement',
    locType: 'nu' as 'nu' | 'meuble' | 'coloc' | 'saisonnier',
    taux: 3.8,
    duree: 20,
    taxeFonciere: 800,
    chargesCopro: 1200,
  })

  const set = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCalculate({ ...DEFAULT_PARAMS, ...form })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* Section 1: Le bien */}
      <FormSection step="1" title="Le bien">
        <div className="space-y-3">
          <Select
            label="Type de bien"
            options={typeBienOptions}
            value={form.typeBien}
            onChange={(e) => set('typeBien', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prix d'achat"
              type="number"
              value={form.prixAchat}
              suffix="€"
              onChange={(e) => set('prixAchat', +e.target.value)}
            />
            <Input
              label="Travaux"
              type="number"
              value={form.travaux}
              suffix="€"
              onChange={(e) => set('travaux', +e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Surface"
              type="number"
              value={form.surface}
              suffix="m²"
              onChange={(e) => set('surface', +e.target.value)}
            />
            <Select
              label="Ville"
              options={villeOptions}
              value={form.ville}
              onChange={(e) => set('ville', e.target.value)}
            />
          </div>
        </div>
      </FormSection>

      <div className="h-px bg-white/[0.05]" />

      {/* Section 2: Location */}
      <FormSection step="2" title="Location">
        <div className="space-y-3">
          <Select
            label="Type"
            options={locTypeOptions}
            value={form.locType}
            onChange={(e) => set('locType', e.target.value)}
          />
          <Input
            label="Loyer mensuel"
            type="number"
            value={form.loyerNu}
            suffix="€/mois"
            onChange={(e) => set('loyerNu', +e.target.value)}
          />
        </div>
      </FormSection>

      <div className="h-px bg-white/[0.05]" />

      {/* Section 3: Financement */}
      <FormSection step="3" title="Financement">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Apport"
              type="number"
              value={form.apport}
              suffix="€"
              onChange={(e) => set('apport', +e.target.value)}
            />
            <Input
              label="Taux"
              type="number"
              step="0.05"
              value={form.taux}
              suffix="%"
              onChange={(e) => set('taux', +e.target.value)}
            />
          </div>
          <Input
            label="Durée"
            type="number"
            value={form.duree}
            suffix="ans"
            onChange={(e) => set('duree', +e.target.value)}
          />
        </div>
      </FormSection>

      <div className="h-px bg-white/[0.05]" />

      {/* Section 4: Charges */}
      <FormSection step="4" title="Charges annuelles">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Taxe foncière"
            type="number"
            value={form.taxeFonciere}
            suffix="€"
            onChange={(e) => set('taxeFonciere', +e.target.value)}
          />
          <Input
            label="Charges copro"
            type="number"
            value={form.chargesCopro}
            suffix="€"
            onChange={(e) => set('chargesCopro', +e.target.value)}
          />
        </div>
      </FormSection>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: loading ? 'rgba(16,185,129,0.2)' : '#10b981',
          color: loading ? '#6ee7b7' : '#022c22',
        }}
        onMouseEnter={(e) => { if (!loading) (e.target as HTMLElement).style.background = '#059669' }}
        onMouseLeave={(e) => { if (!loading) (e.target as HTMLElement).style.background = '#10b981' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Calcul…
          </span>
        ) : (
          'Analyser'
        )}
      </button>
    </form>
  )
}
