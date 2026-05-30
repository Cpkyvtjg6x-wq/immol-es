'use client'

import { useEffect, useState } from 'react'
import { useMotionValue, animate } from 'framer-motion'

const EASE_OUT = [0.16, 1, 0.3, 1] as const

/** Nombre qui s'anime de 0 → value au montage (réutilisable partout). */
export function CountUp({
  value,
  format,
  duration = 1.2,
  className,
  style,
}: {
  value: number
  format: (v: number) => string
  duration?: number
  className?: string
  style?: React.CSSProperties
}) {
  const mv = useMotionValue(0)
  const [text, setText] = useState(() => format(0))
  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: EASE_OUT })
    const unsub = mv.on('change', (v) => setText(format(v)))
    return () => {
      controls.stop()
      unsub()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <span className={className} style={style}>
      {text}
    </span>
  )
}
