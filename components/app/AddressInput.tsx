'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Types BAN API ─────────────────────────────────────────────────────────────

interface BanFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] } // [lng, lat]
  properties: {
    id: string
    label: string        // "12 Rue de la Paix 75002 Paris"
    name: string         // "12 Rue de la Paix"
    postcode: string     // "75002"
    citycode: string     // code INSEE "75056"
    city: string         // "Paris"
    context: string      // "75, Paris, Île-de-France"
    type: string         // "housenumber" | "street" | "locality" | "municipality"
    score: number
    district?: string    // arrondissement si applicable
    street?: string
  }
}

export interface AddressResult {
  label: string       // adresse formatée complète
  adresse: string     // label
  ville: string
  codePostal: string
  codeInsee: string
  lat: number
  lng: number
  quartier?: string   // district ou locality si disponible
  context: string
  type: string
}

interface AddressInputProps {
  value: string                         // texte affiché dans l'input
  onSelect: (result: AddressResult) => void
  onChangeText?: (text: string) => void  // quand l'utilisateur tape
  placeholder?: string
  className?: string
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function AddressInput({
  value,
  onSelect,
  onChangeText,
  placeholder = '12 rue de la Paix, Paris — ou "Quartier Batignolles"',
  className = '',
}: AddressInputProps) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<AddressResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync prop → état local quand le parent change la valeur
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Fermer si clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      // BAN API — pas de clé requise, données officielles France
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=7&autocomplete=1`
      const res = await fetch(url)
      if (!res.ok) throw new Error('BAN API error')
      const data = await res.json()
      const features: BanFeature[] = data.features ?? []

      const results: AddressResult[] = features.map(f => ({
        label: f.properties.label,
        adresse: f.properties.label,
        ville: f.properties.city,
        codePostal: f.properties.postcode,
        codeInsee: f.properties.citycode,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        quartier: f.properties.district ?? (f.properties.type === 'locality' ? f.properties.name : undefined),
        context: f.properties.context,
        type: f.properties.type,
      }))

      setSuggestions(results)
      setOpen(results.length > 0)
      setHighlighted(-1)
    } catch {
      setSuggestions([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    onChangeText?.(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 280)
  }

  const handleSelect = (result: AddressResult) => {
    setQuery(result.label)
    setSuggestions([])
    setOpen(false)
    onSelect(result)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      handleSelect(suggestions[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setHighlighted(-1)
    }
  }

  // Icône type de résultat
  const typeIcon = (type: string) => {
    if (type === 'housenumber') return (
      <svg className="w-3.5 h-3.5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
    if (type === 'street') return (
      <svg className="w-3.5 h-3.5 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    )
    return (
      <svg className="w-3.5 h-3.5 shrink-0 text-th-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }

  // Libellé court pour le type
  const typeLabel = (type: string) => {
    if (type === 'housenumber') return 'Adresse'
    if (type === 'street') return 'Rue'
    if (type === 'locality') return 'Quartier'
    if (type === 'municipality') return 'Commune'
    return 'Lieu'
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Input ── */}
      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none">
          {loading ? (
            <div className="w-3.5 h-3.5 border-[1.5px] border-zinc-600/40 border-t-emerald-400 rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-th-input-bg border border-th-input-border rounded-lg text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/40 transition-all pl-9 pr-3 py-2"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setSuggestions([])
              setOpen(false)
              onChangeText?.('')
              inputRef.current?.focus()
            }}
            className="absolute right-2.5 w-4 h-4 flex items-center justify-center text-th-text-3 hover:text-th-text-1 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Dropdown suggestions ── */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-th-border bg-th-surface shadow-card-th overflow-hidden">
          <div className="py-1">
            {suggestions.map((s, i) => (
              <button
                key={`${s.codeInsee}-${i}`}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
                onMouseEnter={() => setHighlighted(i)}
                className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors ${
                  i === highlighted ? 'bg-th-surface2' : 'hover:bg-th-surface2'
                }`}
              >
                <div className="mt-0.5">{typeIcon(s.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-th-text-1 leading-tight truncate">
                    {s.label}
                  </p>
                  <p className="text-[10px] text-th-text-3 mt-0.5 flex items-center gap-1.5">
                    <span className="text-th-text-3">{typeLabel(s.type)}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                    <span>{s.context}</span>
                  </p>
                </div>
                {s.codePostal && (
                  <span className="text-[10px] font-bold text-th-text-3 shrink-0 mt-0.5">
                    {s.codePostal}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-white/[0.05] flex items-center gap-1.5">
            <svg className="w-2.5 h-2.5 text-th-text-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/>
            </svg>
            <span className="text-[9px] text-th-text-3">Données officielles Base Adresse Nationale · France</span>
          </div>
        </div>
      )}
    </div>
  )
}
