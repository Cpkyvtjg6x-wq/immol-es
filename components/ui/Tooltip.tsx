'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface TooltipProps {
  content: string
  example?: string
  children?: React.ReactNode
  /** Affiche une icône ? par défaut si pas d'enfants */
  icon?: boolean
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, example, children, icon = true, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(true), 120)
  }, [])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 80)
  }, [])

  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const tooltip = tooltipRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const MARGIN = 8

    let x = trigger.left + trigger.width / 2 - tooltip.width / 2
    let y = trigger.top - tooltip.height - 8

    if (side === 'bottom') y = trigger.bottom + 8
    if (side === 'left') {
      x = trigger.left - tooltip.width - 8
      y = trigger.top + trigger.height / 2 - tooltip.height / 2
    }
    if (side === 'right') {
      x = trigger.right + 8
      y = trigger.top + trigger.height / 2 - tooltip.height / 2
    }

    // keep in viewport
    x = Math.max(MARGIN, Math.min(x, vw - tooltip.width - MARGIN))
    if (y < MARGIN) y = trigger.bottom + 8

    setPos({ x, y })
  }, [visible, side])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex items-center cursor-help"
      >
        {children ?? (icon && (
          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/[0.06] border border-white/[0.10] text-[9px] font-bold text-zinc-500 hover:text-zinc-300 hover:border-white/[0.20] hover:bg-white/[0.10] transition-all ml-1 select-none">
            ?
          </span>
        ))}
      </span>

      {/* Portal-style fixed tooltip */}
      {visible && (
        <div
          ref={tooltipRef}
          onMouseEnter={show}
          onMouseLeave={hide}
          className="fixed z-[9999] pointer-events-auto"
          style={{ left: pos.x, top: pos.y }}
        >
          <div
            className="max-w-[260px] rounded-xl border border-white/[0.10] bg-[#18181b]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)_inset] px-3.5 py-3"
            style={{ animation: 'tooltip-in 120ms cubic-bezier(0.16,1,0.3,1)' }}
          >
            <p className="text-[12px] text-zinc-200 leading-[1.55]">{content}</p>
            {example && (
              <p className="text-[11px] text-emerald-400/80 mt-1.5 font-mono">{example}</p>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes tooltip-in {
          from { opacity: 0; transform: translateY(4px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </>
  )
}
