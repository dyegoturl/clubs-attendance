import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { LATE_REPORT_DAYS } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-AE', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export function formatTime(time: string | null): string {
  if (!time) return '—'
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m} ${ampm}`
}

export function formatTimeRange(start: string | null, end: string | null): string {
  if (!start || !end) return '—'
  return `${formatTime(start)} – ${formatTime(end)}`
}

/** Returns class duration in hours from time_start and time_end strings (HH:MM) */
export function classDurationHours(timeStart: string, timeEnd: string): number {
  const [sh, sm] = timeStart.split(':').map(Number)
  const [eh, em] = timeEnd.split(':').map(Number)
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60
}

/** Determines if an attendance submission for a given class date is a late report */
export function isLateReport(classDate: string): boolean {
  const classDt = new Date(classDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  classDt.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - classDt.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays > LATE_REPORT_DAYS
}

/** Generate default password for a coach: DDMMYYYY + last 2 chars of PS number */
export function generateDefaultPassword(dateOfBirth: string, psNumber: string): string {
  const dob = new Date(dateOfBirth)
  const dd = String(dob.getDate()).padStart(2, '0')
  const mm = String(dob.getMonth() + 1).padStart(2, '0')
  const yyyy = dob.getFullYear()
  const last2 = psNumber.slice(-2)
  return `${dd}${mm}${yyyy}${last2}`
}

/** Format currency */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount)
}

/** Get ISO date string for today */
export function today(): string {
  return new Date().toISOString().split('T')[0]
}

/** Get all dates in a month */
export function getDatesInMonth(year: number, month: number): Date[] {
  const dates: Date[] = []
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    dates.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

/** Day name abbreviation */
export function dayAbbr(date: Date): string {
  return date.toLocaleDateString('en-AE', { weekday: 'short' })
}

/** Status badge helper */
export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    P: 'Present', C: 'Cancelled', H: 'Holiday', N: 'No Class', R: 'Relocated'
  }
  return map[status] ?? status
}

/** Count present sessions for worked hours calculation */
export function calcWorkedHours(
  presentSessions: number,
  timeStart: string | null,
  timeEnd: string | null
): number {
  if (!timeStart || !timeEnd) return 0
  return presentSessions * classDurationHours(timeStart, timeEnd)
}
