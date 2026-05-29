'use client'

import type { TagDef } from '@/lib/tags'

/** Pastille de tag — design unique réutilisé partout (bibliothèque, portfolio, import). */
export function TagChip({ tag, size = 'sm' }: { tag: TagDef; size?: 'sm' | 'xs' }) {
  const dot = size === 'xs' ? 3 : 4
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'xs' ? 3 : 4,
        fontSize: size === 'xs' ? 9 : 10,
        fontWeight: 500,
        padding: size === 'xs' ? '2px 6px' : '2px 7px',
        borderRadius: 20,
        background: `${tag.color}18`,
        color: tag.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: dot, height: dot, borderRadius: '50%', background: tag.color }} />
      {tag.label}
    </span>
  )
}
