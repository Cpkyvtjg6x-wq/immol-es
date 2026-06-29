import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  color?: 'emerald' | 'indigo' | 'amber' | 'red' | 'zinc'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function Progress({
  value,
  max = 100,
  color = 'emerald',
  size = 'md',
  showLabel = false,
  className,
  ...props
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  const colors = {
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    zinc: 'bg-zinc-500',
  }

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={cn('w-full', className)} {...props}>
      <div className={cn('w-full bg-th-surface2 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', colors[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-right text-xs text-th-text-3">{Math.round(pct)}%</div>
      )}
    </div>
  )
}
