export const REGIONS = ['Abu Dhabi', 'Al Ain', 'Ajman', 'Dubai', 'Sharjah', 'RAK', 'Al Dhafra'] as const
export const PROGRAMS = ['UAEJJ Clubs', 'MOI'] as const
export const CLASS_TYPES = ['Kids and Youth', 'Juvenile and Adults'] as const
export const GENDERS = ['Male', 'Female', 'Mix'] as const
export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export const ABSENCE_REASONS = [
  { code: 'N' as const, label: 'Sick' },
  { code: 'R' as const, label: 'Replaced' },
  { code: 'C' as const, label: 'Class Canceled' },
  { code: 'H' as const, label: 'Tournament' },
] satisfies { code: 'P' | 'C' | 'H' | 'N' | 'R'; label: string }[]

export const ATTENDANCE_CODES = {
  P: { label: 'Present',     color: 'green',  bg: 'bg-green-500/20',  text: 'text-green-400',  border: 'border-green-500/30' },
  C: { label: 'Cancelled',   color: 'amber',  bg: 'bg-amber-500/20',  text: 'text-amber-400',  border: 'border-amber-500/30' },
  H: { label: 'Holiday',     color: 'blue',   bg: 'bg-blue-500/20',   text: 'text-blue-400',   border: 'border-blue-500/30'  },
  N: { label: 'No Class',    color: 'gray',   bg: 'bg-gray-500/10',   text: 'text-gray-500',   border: 'border-gray-600/20'  },
  R: { label: 'Relocated',   color: 'purple', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30'},
} as const

// Attendance can be submitted same day or next day without penalty.
// After that it's accepted but flagged as late.
export const LATE_REPORT_DAYS = 1

// Consecutive missed days before supervisor is alerted
export const CONSECUTIVE_MISS_THRESHOLD = 2

export const ROUTES = {
  login: '/login',
  coach: {
    dashboard: '/coach/dashboard',
    attendance: '/coach/attendance',
    history: '/coach/history',
  },
  supervisor: {
    dashboard: '/supervisor/dashboard',
    coaches: '/supervisor/coaches',
    alerts: '/supervisor/alerts',
    assignments: '/supervisor/assignments',
  },
  admin: {
    dashboard: '/admin/dashboard',
    users: '/admin/users',
    reports: '/admin/reports',
    clubs: '/admin/clubs',
    rates: '/admin/rates',
    audit: '/admin/audit',
  },
} as const
