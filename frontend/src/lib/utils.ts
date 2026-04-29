import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n)
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`
}
