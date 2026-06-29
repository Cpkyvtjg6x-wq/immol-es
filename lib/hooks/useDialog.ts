import { useEffect, useRef } from 'react'

/**
 * Accessibilité des modales — à spreader sur le panneau de contenu.
 *
 * Fournit : fermeture à la touche Échap, piège de focus (Tab/Shift+Tab cyclent
 * dans la modale), focus initial sur le panneau, et restitution du focus à
 * l'élément précédent à la fermeture. + props ARIA (role=dialog, aria-modal).
 *
 * Usage :
 *   const { dialogRef, dialogProps } = useDialog(open, onClose)
 *   <div ref={dialogRef} {...dialogProps} aria-label="…">…</div>
 */
export function useDialog(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null

    // Focus initial sur le panneau (tabIndex -1 le rend focusable).
    const focusTimer = setTimeout(() => dialogRef.current?.focus(), 0)

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const node = dialogRef.current
      if (!node) return
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const activeEl = document.activeElement
      if (e.shiftKey && (activeEl === first || activeEl === node)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown, true)
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  return {
    dialogRef,
    dialogProps: {
      role: 'dialog' as const,
      'aria-modal': true,
      tabIndex: -1,
    },
  }
}
