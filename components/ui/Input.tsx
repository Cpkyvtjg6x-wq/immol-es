import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  prefix?: string
  suffix?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, prefix, suffix, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-th-text-2">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-th-text-3 text-sm pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full bg-th-surface2/60 border border-th-border-med rounded-xl px-3 py-2.5 text-sm text-th-text-1 placeholder:text-th-text-3',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50',
              'transition-all duration-200',
              error && 'border-red-500/50 focus:ring-red-500/50',
              prefix && 'pl-8',
              suffix && 'pr-8',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-th-text-3 text-sm pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        {hint && !error && <p className="text-xs text-th-text-3">{hint}</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export { Input }
