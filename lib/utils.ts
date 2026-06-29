import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format number as French currency
 * @example formatCurrency(12500) → "12 500 €"
 */
export function formatCurrency(n: number | undefined | null, decimals = 0): string {
  if (n === undefined || n === null || isNaN(n)) return '0 €'
  return (
    new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n) + ' €'
  )
}

/**
 * Format number as French currency, short form (k)
 * @example formatCurrencyShort(125000) → "125 k€"
 */
export function formatCurrencyShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M€'
  }
  if (Math.abs(n) >= 1_000) {
    return Math.round(n / 1_000) + ' k€'
  }
  return formatCurrency(n)
}

/**
 * Format number as percentage
 * @example formatPct(5.234) → "5.23%"
 */
export function formatPct(n: number | undefined | null, decimals = 2): string {
  if (n === undefined || n === null || isNaN(n)) return '0%'
  return n.toFixed(decimals).replace('.', ',') + '%'
}

/**
 * Format plain number with French locale
 * @example formatNumber(12500) → "12 500"
 */
export function formatNumber(n: number | undefined | null, decimals = 0): string {
  if (n === undefined || n === null || isNaN(n)) return '0'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

/**
 * Format cash-flow with sign and color hint
 */
export function formatCashflow(n: number): { text: string; positive: boolean } {
  const positive = n >= 0
  return {
    text: (positive ? '+' : '') + formatCurrency(n) + '/mois',
    positive,
  }
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Round to N decimal places
 */
export function round(n: number, decimals = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round(n * factor) / factor
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Get color class based on value thresholds
 */
export function getColorClass(
  value: number,
  thresholds: { good: number; ok: number }
): 'emerald' | 'amber' | 'red' {
  if (value >= thresholds.good) return 'emerald'
  if (value >= thresholds.ok) return 'amber'
  return 'red'
}

/**
 * Format date to French locale
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}
