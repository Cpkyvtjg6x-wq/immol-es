'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app/AppShell'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSimulations, SavedSimulation } from '@/lib/hooks/useSimulations'

/* ─── Types ─────────────────────────────────────────── */
interface CustomTag {
  id: string
  label: string
  color: string
  custom: true
}

const DEFAULT_TAGS = [
  { id: 'visit',  label: 'A visiter',     color: '#60a5fa', custom: false as const },
  { id: 'heart',  label: 'Coup de coeur', color: '#fb7185', custom: false as const },
  { id: 'offer',  label: 'Sous offre',    color: '#fbbf24', custom: false as const },
  { id: 'signed', label: 'Signe',         color: '#4ade80', custom: false as const },
  { id: 'owned',  label: 'Possede',       color: '#c4b5fd', custom: false as const },
  { id: 'refuse', label: 'Refuse',        color: '#52525b', custom: false as const },
]

type TagDef = typeof DEFAULT_TAGS[number] | CustomTag
type SortKey = 'score' | 'rendementNet' | 'cashflowMensuel' | 'created_at' | 'prixAchat'
type ViewMode = 'grid' | 'list' | 'kanban'

const COLOR_PALETTE = [
  '#60a5fa','#38bdf8','#818cf8','#a78bfa',
  '#fb7185','#f472b6','#e879f9','#f87171',
  '#fbbf24','#fb923c','#facc15','#a3e635',
  '#4ade80','#34d399','#2dd4bf','#94a3b8',
]

/* ─── Hook custom tags ───────────────────────────────── */
function useCustomTags(userId: string | null) {
  const key = userId ? `immora_ctags_${userId}` : null
  const [customTags, setCustomTags] = useState<CustomTag[]>([])
  useEffect(() => {
    if (!key) return
    try { const s = localStorage.getItem(key); if (s) setCustomTags(JSON.parse(s)) } catch {}
  }, [key])
  const addTag = useCallback((tag: CustomTag) => {
    setCustomTags(prev => { const n = [...prev, tag]; if (key) localStorage.setItem(key, JSON.stringify(n)); return n })
  }, [key])
  const removeTag = useCallback((id: string) => {
    setCustomTags(prev => { const n = prev.filter(t => t.id !== id); if (key) localStorage.setItem(key, JSON.stringify(n)); return n })
  }, [key])
  return { customTags, addTag, removeTag }
}

/* ─── Helpers ────────────────────────────────────────── */
function scoreColor(s: number) {
  if (s >= 70) return '#4ade80'
  if (s >= 45) return '#fbbf24'
  return '#f87171'
}
function scoreGlow(s: number) {
  if (s >= 70) return 'rgba(74,222,128,'
  if (s >= 45) return 'rgba(251,191,36,'
  return 'rgba(248,113,113,'
}
function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) }
function cfSign(n: number) { return n >= 0 ? '+' : '' }

function deriveSubScores(sim: SavedSimulation) {
  const rdt = sim.rendementNet
  const cf = sim.cashflowMensuel
  const rentabilite = rdt > 8 ? 95 : rdt > 6 ? 82 : rdt > 5 ? 70 : rdt > 4 ? 56 : rdt > 3 ? 38 : 20
  const cashflow = cf >= 200 ? 95 : cf >= 30 ? 78 : cf >= -100 ? 60 : cf >= -300 ? 38 : 18
  const global = sim.score ?? 50
  const fiscalite = Math.min(95, Math.max(10, Math.round(global * 1.4 - rentabilite * 0.25 - cashflow * 0.15)))
  return { rentabilite, cashflow, fiscalite }
}

/* ─── Score Ring SVG ─────────────────────────────────── */
function ScoreRing({ score, size = 38 }: { score: number; size?: number }) {
  const r = size * 0.39
  const c = size / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(score, 100) / 100)
  const col = scoreColor(score)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={`${col}22`} strokeWidth={size * 0.079}/>
      <circle cx={c} cy={c} r={r} fill="none" stroke={col} strokeWidth={size * 0.079}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`}/>
      <text x={c} y={c + size * 0.145} textAnchor="middle"
        fontSize={size * 0.263} fontWeight="600" fill={col}>{score}</text>
    </svg>
  )
}

/* ─── Bandeau de stats ───────────────────────────────── */
function StatsBanner({ sims }: { sims: SavedSimulation[] }) {
  if (sims.length === 0) return null
  const avgScore = Math.round(sims.reduce((a, s) => a + (s.score ?? 0), 0) / sims.length)
  const totalCf = sims.reduce((a, s) => a + s.cashflowMensuel, 0)
  const bestRdt = Math.max(...sims.map(s => s.rendementNet))
  const bestSim = sims.find(s => s.rendementNet === bestRdt)
  const stats = [
    { label: 'Biens analyses', value: String(sims.length), sub: `${sims.filter(s => s.tags.length > 0).length} avec tag` },
    { label: 'Score moyen', value: String(avgScore), sub: 'sur 100', color: scoreColor(avgScore) },
    { label: 'Cashflow cumule', value: `${cfSign(totalCf)}${fmt(totalCf)} EUR`, sub: 'si tous loues', color: totalCf >= 0 ? '#4ade80' : '#f87171' },
    { label: 'Meilleur rdt', value: `${bestRdt.toFixed(1)}%`, sub: bestSim?.name || '', color: '#4ade80' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: '#111113', border: '0.5px solid #27272a', borderRadius: 9, padding: '12px 14px' }}>
          <p style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{s.label}</p>
          <p style={{ fontSize: 20, fontWeight: 600, color: s.color || '#fff', letterSpacing: '-.02em' }}>{s.value}</p>
          <p style={{ fontSize: 10, color: '#52525b', marginTop: 2 }}>{s.sub}</p>
        </div>
      ))}
    </div>
  )
}

/* ─── Modal creation de tag ──────────────────────────── */
function CreateTagModal({ onClose, onCreate }: { onClose: () => void; onCreate: (tag: CustomTag) => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#60a5fa')
  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate({ id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label: trimmed, color, custom: true })
    onClose()
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#18181b', border: '0.5px solid #27272a', borderRadius: 14, padding: '24px 24px 20px', width: 340, boxShadow: '0 24px 64px rgba(0,0,0,.8)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '-.02em' }}>Nouveau tag</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 11, color: '#71717a', marginBottom: 7, fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase' }}>Nom du tag</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            placeholder="Ex: A financer, A negocie..." maxLength={28}
            style={{ width: '100%', background: '#111113', border: '0.5px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13, padding: '9px 12px', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => (e.target.style.borderColor = '#3f3f46')} onBlur={e => (e.target.style.borderColor = '#27272a')} />
        </div>
        <div style={{ marginBottom: 22 }}>
          <label style={{ display: 'block', fontSize: 11, color: '#71717a', marginBottom: 10, fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase' }}>Couleur</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 7, marginBottom: 12 }}>
            {COLOR_PALETTE.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ width: '100%', aspectRatio: '1', borderRadius: '50%', background: c, border: color === c ? '2.5px solid #fff' : '2.5px solid transparent', cursor: 'pointer', outline: 'none', transition: 'transform .1s', transform: color === c ? 'scale(1.15)' : 'scale(1)' }} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
              <div style={{ width: 28, height: 28, borderRadius: 7, background: color, border: '0.5px solid rgba(255,255,255,.15)', cursor: 'pointer' }} />
            </div>
            <p style={{ fontSize: 11, color: '#52525b' }}>Couleur libre</p>
            <div style={{ marginLeft: 'auto' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, background: `${color}18`, color }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />{name || 'Apercu'}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 9, background: 'none', border: '0.5px solid #27272a', borderRadius: 8, color: '#71717a', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleCreate} disabled={!name.trim()} style={{ flex: 2, padding: 9, background: name.trim() ? '#fff' : '#27272a', border: 'none', borderRadius: 8, color: name.trim() ? '#09090b' : '#52525b', fontSize: 13, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'all .15s' }}>Creer le tag</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Tag Picker ─────────────────────────────────────── */
function TagPicker({ sim, allTags, onUpdate, onCreateTag }: { sim: SavedSimulation; allTags: TagDef[]; onUpdate: (id: string, tags: string[]) => void; onCreateTag: () => void }) {
  const [open, setOpen] = useState(false)
  const toggle = (tagId: string) => {
    const next = sim.tags.includes(tagId) ? sim.tags.filter(t => t !== tagId) : [...sim.tags, tagId]
    onUpdate(sim.id, next)
  }
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#3f3f46', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 5 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
        {sim.tags.length === 0 && <span>Tag</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 50, background: '#18181b', border: '0.5px solid #27272a', borderRadius: 9, padding: 4, marginBottom: 4, minWidth: 175, boxShadow: '0 8px 24px rgba(0,0,0,.6)' }} onMouseLeave={() => setOpen(false)}>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {allTags.map(t => (
              <button key={t.id} onClick={e => { e.stopPropagation(); toggle(t.id) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px', borderRadius: 6, background: sim.tags.includes(t.id) ? 'rgba(255,255,255,.06)' : 'none', border: 'none', cursor: 'pointer', color: '#a1a1aa', fontSize: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: 'left' }}>{t.label}</span>
                {sim.tags.includes(t.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </button>
            ))}
          </div>
          <div style={{ borderTop: '0.5px solid #27272a', margin: '4px 0', paddingTop: 4 }}>
            <button onClick={e => { e.stopPropagation(); setOpen(false); onCreateTag() }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', fontSize: 12 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Nouveau tag...
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Sim Card (grille) ──────────────────────────────── */
function SimCard({ sim, allTags, onUpdate, onDelete, onClick, onCreateTag }: { sim: SavedSimulation; allTags: TagDef[]; onUpdate: (id: string, tags: string[]) => void; onDelete: (id: string) => void; onClick: (id: string) => void; onCreateTag: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const score = sim.score ?? 0
  const col = scoreColor(score)
  const glow = scoreGlow(score)
  const sub = deriveSubScores(sim)

  return (
    <div
      style={{ background: '#111113', border: '0.5px solid #27272a', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'border-color .15s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#3f3f46')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#27272a')}
    >
      {/* Bande score + halo couleur */}
      <div style={{ height: 3, background: col }} />
      <div style={{ background: `linear-gradient(to bottom, ${glow}0.07), transparent)`, paddingTop: 1 }}>
        <div style={{ padding: '11px 13px 10px' }} onClick={() => onClick(sim.id)}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 9 }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '-.01em', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sim.name}</p>
              <p style={{ fontSize: 11, color: '#52525b' }}>{sim.ville} · {fmt(sim.prixAchat)} EUR</p>
            </div>
            <ScoreRing score={score} size={38} />
          </div>

          {/* KPIs */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
            {[
              { label: 'Rdt net', value: `${sim.rendementNet.toFixed(1)}%`, color: scoreColor(sim.rendementNet > 5 ? 80 : sim.rendementNet > 3.5 ? 55 : 30) },
              { label: 'Cashflow', value: `${cfSign(sim.cashflowMensuel)}${fmt(sim.cashflowMensuel)} EUR`, color: sim.cashflowMensuel >= 0 ? '#4ade80' : '#f87171' },
              { label: 'Regime', value: (sim.params as Record<string,string>)?.regimeFiscal || 'LMNP', color: '#71717a' },
            ].map(k => (
              <div key={k.label}>
                <p style={{ fontSize: 9, color: '#52525b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{k.label}</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Score breakdown */}
          <div style={{ borderTop: '0.5px solid #1c1c1f', paddingTop: 9, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              { label: 'Rendement', val: sub.rentabilite },
              { label: 'Cashflow',  val: sub.cashflow },
              { label: 'Fiscalite', val: sub.fiscalite },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 9, color: '#52525b', width: 52, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '.04em' }}>{row.label}</span>
                <div style={{ flex: 1, height: 3, background: '#27272a', borderRadius: 2 }}>
                  <div style={{ width: `${row.val}%`, height: 3, background: scoreColor(row.val), borderRadius: 2, transition: 'width .4s ease' }} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, color: scoreColor(row.val), width: 20, textAlign: 'right' }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer tags */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', padding: '7px 12px', borderTop: '0.5px solid #1c1c1f' }}>
        {sim.tags.map(tid => {
          const t = allTags.find(x => x.id === tid)
          if (!t) return null
          return (
            <span key={tid} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: `${t.color}18`, color: t.color }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: t.color }} />{t.label}
            </span>
          )
        })}
        {sim.tags.length === 0 && <span style={{ fontSize: 10, color: '#3f3f46' }}>Aucun tag</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, position: 'relative' }}>
          <TagPicker sim={sim} allTags={allTags} onUpdate={onUpdate} onCreateTag={onCreateTag} />
          <button onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3f3f46', padding: '2px 3px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="19" r="1" fill="currentColor" /></svg>
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', bottom: '100%', right: 0, zIndex: 50, background: '#18181b', border: '0.5px solid #27272a', borderRadius: 8, padding: 4, marginBottom: 4, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,.6)' }} onMouseLeave={() => setMenuOpen(false)}>
              {[
                { label: 'Ouvrir', icon: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14', danger: false },
                { label: 'Supprimer', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', danger: true },
              ].map(item => (
                <button key={item.label} onClick={() => { setMenuOpen(false); if (item.label === 'Supprimer') onDelete(sim.id) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px', borderRadius: 5, background: 'none', border: 'none', cursor: 'pointer', color: item.danger ? '#f87171' : '#a1a1aa', fontSize: 12 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Sim Row (liste dense) ──────────────────────────── */
function SimRow({ sim, allTags, onUpdate, onDelete, onClick, onCreateTag }: { sim: SavedSimulation; allTags: TagDef[]; onUpdate: (id: string, tags: string[]) => void; onDelete: (id: string) => void; onClick: (id: string) => void; onCreateTag: () => void }) {
  const score = sim.score ?? 0
  const col = scoreColor(score)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderBottom: '0.5px solid #1c1c1f', cursor: 'pointer', transition: 'background .12s' }} onMouseEnter={e => (e.currentTarget.style.background = '#111113')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <ScoreRing score={score} size={30} />
      <div style={{ flex: 1, minWidth: 0 }} onClick={() => onClick(sim.id)}>
        <p style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', marginBottom: 1, letterSpacing: '-.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sim.name}</p>
        <p style={{ fontSize: 11, color: '#52525b' }}>{sim.ville} · {fmt(sim.prixAchat)} EUR</p>
      </div>
      <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 9, color: '#52525b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 1 }}>Rdt net</p>
          <p style={{ fontSize: 12, fontWeight: 600, color: scoreColor(sim.rendementNet > 5 ? 80 : sim.rendementNet > 3.5 ? 55 : 30) }}>{sim.rendementNet.toFixed(1)}%</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 9, color: '#52525b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 1 }}>Cashflow</p>
          <p style={{ fontSize: 12, fontWeight: 600, color: sim.cashflowMensuel >= 0 ? '#4ade80' : '#f87171' }}>{cfSign(sim.cashflowMensuel)}{fmt(sim.cashflowMensuel)} EUR</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {sim.tags.slice(0, 3).map(tid => {
          const t = allTags.find(x => x.id === tid)
          if (!t) return null
          return <span key={tid} style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} title={t.label} />
        })}
        {sim.tags.length > 3 && <span style={{ fontSize: 10, color: '#52525b' }}>+{sim.tags.length - 3}</span>}
      </div>
      <TagPicker sim={sim} allTags={allTags} onUpdate={onUpdate} onCreateTag={onCreateTag} />
    </div>
  )
}

/* ─── Vue Kanban ─────────────────────────────────────── */
function KanbanView({ sims, allTags, onUpdate, onDelete, onClick, onCreateTag }: { sims: SavedSimulation[]; allTags: TagDef[]; onUpdate: (id: string, tags: string[]) => void; onDelete: (id: string) => void; onClick: (id: string) => void; onCreateTag: () => void }) {
  const untagged = sims.filter(s => s.tags.length === 0)
  const tagCols = allTags.filter(t => sims.some(s => s.tags.includes(t.id)))
  const cols = [...tagCols, ...(untagged.length > 0 ? [{ id: '__none__', label: 'Non classe', color: '#3f3f46' } as TagDef] : [])]

  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, minHeight: 200 }}>
      {cols.map(col => {
        const colSims = col.id === '__none__' ? untagged : sims.filter(s => s.tags.includes(col.id))
        return (
          <div key={col.id} style={{ minWidth: 240, maxWidth: 260, flexShrink: 0 }}>
            {/* Header colonne */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', marginBottom: 8, background: '#111113', borderRadius: 8, border: '0.5px solid #1c1c1f' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', flex: 1 }}>{col.label}</span>
              <span style={{ fontSize: 10, color: '#52525b', background: '#1c1c1f', borderRadius: 10, padding: '1px 6px' }}>{colSims.length}</span>
            </div>
            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {colSims.map(sim => {
                const score = sim.score ?? 0
                const c = scoreColor(score)
                return (
                  <div key={sim.id} onClick={() => onClick(sim.id)} style={{ background: '#111113', border: '0.5px solid #27272a', borderRadius: 9, overflow: 'hidden', cursor: 'pointer', transition: 'border-color .12s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = '#3f3f46')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#27272a')}>
                    <div style={{ height: 2.5, background: c }} />
                    <div style={{ padding: '9px 11px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 7 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sim.name}</p>
                          <p style={{ fontSize: 10, color: '#52525b' }}>{sim.ville} · {fmt(sim.prixAchat)} EUR</p>
                        </div>
                        <ScoreRing score={score} size={30} />
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div>
                          <p style={{ fontSize: 9, color: '#52525b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 1 }}>Rdt</p>
                          <p style={{ fontSize: 11, fontWeight: 600, color: scoreColor(sim.rendementNet > 5 ? 80 : sim.rendementNet > 3.5 ? 55 : 30) }}>{sim.rendementNet.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 9, color: '#52525b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 1 }}>CF</p>
                          <p style={{ fontSize: 11, fontWeight: 600, color: sim.cashflowMensuel >= 0 ? '#4ade80' : '#f87171' }}>{cfSign(sim.cashflowMensuel)}{fmt(sim.cashflowMensuel)} EUR</p>
                        </div>
                      </div>
                      {/* Tags de la carte */}
                      {sim.tags.filter(tid => tid !== col.id).length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 7, flexWrap: 'wrap' }}>
                          {sim.tags.filter(tid => tid !== col.id).map(tid => {
                            const t = allTags.find(x => x.id === tid)
                            if (!t) return null
                            return <span key={tid} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 500, padding: '1px 6px', borderRadius: 20, background: `${t.color}14`, color: t.color }}><span style={{ width: 4, height: 4, borderRadius: '50%', background: t.color }} />{t.label}</span>
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {colSims.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 11, color: '#3f3f46' }}>Aucun bien</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Page principale ────────────────────────────────── */
export default function BibliotequePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { simulations, loading, deleteSimulation, updateTags } = useSimulations(user?.id ?? null)
  const { customTags, addTag } = useCustomTags(user?.id ?? null)

  const [tagFilter, setTagFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const allTags: TagDef[] = useMemo(() => [...DEFAULT_TAGS, ...customTags], [customTags])

  const filtered = useMemo(() => {
    let list = simulations
    if (tagFilter !== 'all') list = list.filter(s => s.tags.includes(tagFilter))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.ville.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      if (sortKey === 'created_at') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortKey === 'prixAchat') return b.prixAchat - a.prixAchat
      const va = (a as unknown as Record<string,number>)[sortKey] ?? 0
      const vb = (b as unknown as Record<string,number>)[sortKey] ?? 0
      return vb - va
    })
  }, [simulations, tagFilter, search, sortKey])

  const openSim = useCallback(() => { router.push('/analyse') }, [router])

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'score', label: 'Score' },
    { key: 'rendementNet', label: 'Rendement' },
    { key: 'cashflowMensuel', label: 'Cashflow' },
    { key: 'created_at', label: 'Date' },
    { key: 'prixAchat', label: 'Prix' },
  ]

  const viewModes: { key: ViewMode; icon: React.ReactNode }[] = [
    { key: 'grid', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { key: 'list', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg> },
    { key: 'kanban', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg> },
  ]

  return (
    <>
      {showCreateModal && (
        <CreateTagModal onClose={() => setShowCreateModal(false)} onCreate={(tag) => { addTag(tag); setShowCreateModal(false) }} />
      )}
      <AppShell activeTag={tagFilter} onTagFilter={setTagFilter} customTags={customTags} onCreateTag={() => setShowCreateModal(true)}>
        <div style={{ minHeight: '100vh', background: '#09090b', color: '#fff', display: 'flex', flexDirection: 'column' }}>

          {/* Topbar */}
          <div style={{ padding: '14px 24px 12px', borderBottom: '0.5px solid #1c1c1f', display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.02em', color: '#fff', flex: 1 }}>
              Bibliotheque
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: '#52525b' }}>{tagFilter === 'all' ? simulations.length : filtered.length} bien{simulations.length !== 1 ? 's' : ''}</span>
            </h1>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#111113', border: '0.5px solid #27272a', borderRadius: 8, padding: '6px 12px', width: 200 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12, color: '#a1a1aa', width: '100%' }} />
            </div>
            {/* Sort */}
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} style={{ background: '#111113', border: '0.5px solid #27272a', borderRadius: 8, color: '#71717a', fontSize: 12, padding: '6px 10px', cursor: 'pointer', outline: 'none' }}>
              {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            {/* Vue toggle */}
            <div style={{ display: 'flex', border: '0.5px solid #27272a', borderRadius: 8, overflow: 'hidden' }}>
              {viewModes.map((v, i) => (
                <button key={v.key} onClick={() => setViewMode(v.key)} style={{ padding: '6px 9px', background: viewMode === v.key ? '#1c1c1f' : '#111113', border: 'none', cursor: 'pointer', color: viewMode === v.key ? '#fff' : '#3f3f46', borderRight: i < viewModes.length - 1 ? '0.5px solid #27272a' : 'none' }}>
                  {v.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Contenu */}
          <div style={{ flex: 1, padding: '16px 24px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#52525b', fontSize: 13 }}>Chargement...</div>
            ) : filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#111113', border: '0.5px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#71717a' }}>{search ? 'Aucun resultat' : tagFilter !== 'all' ? 'Aucun bien avec ce tag' : 'Aucune simulation sauvegardee'}</p>
                {!search && tagFilter === 'all' && (
                  <button onClick={() => router.push('/analyse')} style={{ marginTop: 4, padding: '8px 16px', background: '#fff', color: '#09090b', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Analyser un bien</button>
                )}
              </div>
            ) : (
              <>
                {/* Bandeau stats */}
                <StatsBanner sims={filtered} />

                {viewMode === 'grid' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                    {filtered.map(s => <SimCard key={s.id} sim={s} allTags={allTags} onUpdate={updateTags} onDelete={deleteSimulation} onClick={openSim} onCreateTag={() => setShowCreateModal(true)} />)}
                  </div>
                )}

                {viewMode === 'list' && (
                  <div style={{ background: '#111113', border: '0.5px solid #27272a', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderBottom: '0.5px solid #1c1c1f' }}>
                      <span style={{ width: 30, flexShrink: 0, fontSize: 10, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '.06em' }}>Score</span>
                      <span style={{ flex: 1, fontSize: 10, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '.06em' }}>Bien</span>
                      <span style={{ width: 100, fontSize: 10, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'right' }}>Rdt net</span>
                      <span style={{ width: 100, fontSize: 10, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'right' }}>Cashflow</span>
                      <span style={{ width: 60, fontSize: 10, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '.06em' }}>Tags</span>
                      <span style={{ width: 30 }} />
                    </div>
                    {filtered.map(s => <SimRow key={s.id} sim={s} allTags={allTags} onUpdate={updateTags} onDelete={deleteSimulation} onClick={openSim} onCreateTag={() => setShowCreateModal(true)} />)}
                  </div>
                )}

                {viewMode === 'kanban' && (
                  <KanbanView sims={filtered} allTags={allTags} onUpdate={updateTags} onDelete={deleteSimulation} onClick={openSim} onCreateTag={() => setShowCreateModal(true)} />
                )}
              </>
            )}
          </div>
        </div>
      </AppShell>
    </>
  )
}
