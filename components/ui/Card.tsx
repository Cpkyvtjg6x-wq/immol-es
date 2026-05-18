import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean
  hover?: boolean
  glow?: 'emerald' | 'indigo' | 'none'
}

export function Card({ className, glass = true, hover = false, glow = 'none', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-800/60',
        glass ? 'bg-zinc-900/60 backdrop-blur-sm' : 'bg-zinc-900',
        hover && 'transition-all duration-200 hover:border-zinc-700 hover:-translate-y-0.5 cursor-pointer',
        glow === 'emerald' && 'shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/10',
        glow === 'indigo' && 'shadow-lg shadow-indigo-500/5 hover:shadow-indigo-500/10',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-5 border-b border-zinc-800/60', className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-t border-zinc-800/60', className)} {...props}>
      {children}
    </div>
  )
}
