'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  success: (msg: string, duration?: number) => void
  error: (msg: string, duration?: number) => void
  info: (msg: string, duration?: number) => void
  warning: (msg: string, duration?: number) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  // Fallback silencieux si appelé hors provider (évite le crash)
  if (!ctx) {
    const noop = () => {}
    return { success: noop, error: noop, info: noop, warning: noop }
  }
  return ctx
}

// ─── Single Toast item ────────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
}

const STYLES: Record<ToastType, { icon: string; bar: string; bg: string; border: string }> = {
  success: { icon: 'text-emerald-400', bar: 'bg-emerald-500', bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/25' },
  error:   { icon: 'text-red-400',     bar: 'bg-red-500',     bg: 'bg-red-500/[0.06]', border: 'border-red-500/25' },
  info:    { icon: 'text-blue-400',    bar: 'bg-blue-500',    bg: 'bg-blue-500/[0.06]', border: 'border-blue-500/25' },
  warning: { icon: 'text-amber-400',   bar: 'bg-amber-500',   bg: 'bg-amber-500/[0.06]', border: 'border-amber-500/25' },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const s = STYLES[toast.type]
  const duration = toast.duration ?? 3500

  useEffect(() => {
    // Entrée
    const t1 = setTimeout(() => setVisible(true), 10)
    // Sortie
    const t2 = setTimeout(() => {
      setLeaving(true)
      setTimeout(() => onRemove(toast.id), 350)
    }, duration)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [toast.id, duration, onRemove])

  return (
    <div
      className={`
        relative flex items-center gap-3 px-4 py-3.5 rounded-xl border shadow-2xl
        min-w-[260px] max-w-[360px] overflow-hidden cursor-pointer
        transition-all duration-300 ease-out
        ${s.bg} ${s.border}
        ${visible && !leaving ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
      `}
      onClick={() => { setLeaving(true); setTimeout(() => onRemove(toast.id), 300) }}
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${s.bar} rounded-full`}
        style={{
          animation: `shrink ${duration}ms linear forwards`,
        }}
      />

      {/* Icon */}
      <div className={`shrink-0 ${s.icon}`}>{ICONS[toast.type]}</div>

      {/* Message */}
      <p className="text-sm font-medium text-th-text-1 leading-snug flex-1">{toast.message}</p>

      {/* Close */}
      <button className="shrink-0 text-th-text-3 hover:text-th-text-2 transition-colors ml-1">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const add = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = `toast-${++counter.current}`
    setToasts(prev => [...prev.slice(-4), { id, type, message, duration }])
  }, [])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const value: ToastContextValue = {
    success: (msg, d) => add('success', msg, d),
    error:   (msg, d) => add('error', msg, d),
    info:    (msg, d) => add('info', msg, d),
    warning: (msg, d) => add('warning', msg, d),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Portal-like fixed container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>

      {/* Keyframe for progress bar shrink */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  )
}
