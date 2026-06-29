'use client'

import { useEffect } from 'react'

/**
 * Force le thème sombre sur la page où ce composant est monté, puis restaure la
 * préférence de l'utilisateur en quittant.
 *
 * Usage : pages publiques / marketing (landing, auth, checkout, contact,
 * méthodologie) — elles n'ont pas de toggle de thème et sont conçues en sombre.
 * Évite aussi que le `.light` choisi dans l'app ne « fuite » vers ces pages.
 */
export function ForceDark() {
  useEffect(() => {
    const html = document.documentElement
    const wasLight = html.classList.contains('light')
    html.classList.remove('light')
    return () => {
      if (wasLight) html.classList.add('light')
    }
  }, [])
  return null
}
