// ─── Tags — source unique partagée dans toute l'application ─────────────────
// (bibliothèque, sélecteur d'import, portfolio, sidebar)

export interface CustomTag {
  id: string
  label: string
  color: string
  custom: true
}

export interface DefaultTag {
  id: string
  label: string
  color: string
  custom: false
}

export type TagDef = DefaultTag | CustomTag

export const DEFAULT_TAGS: DefaultTag[] = [
  { id: 'visit',  label: 'A visiter',     color: '#60a5fa', custom: false },
  { id: 'heart',  label: 'Coup de coeur', color: '#fb7185', custom: false },
  { id: 'offer',  label: 'Sous offre',    color: '#fbbf24', custom: false },
  { id: 'signed', label: 'Signe',         color: '#4ade80', custom: false },
  { id: 'owned',  label: 'Possede',       color: '#c4b5fd', custom: false },
  { id: 'refuse', label: 'Refuse',        color: 'var(--c-text-3)', custom: false },
]

export const TAG_COLOR_PALETTE = [
  '#60a5fa', '#38bdf8', '#818cf8', '#a78bfa',
  '#fb7185', '#f472b6', '#e879f9', '#f87171',
  '#fbbf24', '#fb923c', '#facc15', '#a3e635',
  '#4ade80', '#34d399', '#2dd4bf', '#94a3b8',
]

/** Clé localStorage des tags personnalisés (par utilisateur). */
export function customTagsKey(userId: string | null): string | null {
  return userId ? `immora_ctags_${userId}` : null
}

/** Lecture synchrone des tags personnalisés (hors hook). */
export function loadCustomTags(userId: string | null): CustomTag[] {
  const key = customTagsKey(userId)
  if (!key || typeof window === 'undefined') return []
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as CustomTag[]) : []
  } catch {
    return []
  }
}

/** Résout un id de tag vers sa définition (défaut + personnalisés). */
export function resolveTag(id: string, customTags: CustomTag[] = []): TagDef | undefined {
  return DEFAULT_TAGS.find(t => t.id === id) ?? customTags.find(t => t.id === id)
}
