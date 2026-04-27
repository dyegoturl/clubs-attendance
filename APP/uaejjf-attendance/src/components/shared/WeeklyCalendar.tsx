'use client'

import { cn, formatTimeRange } from '@/lib/utils'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DAY_ABBR: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat',
}

interface ClassSlot {
  id: string
  club_name?: string
  class_identifier: string | null
  class_type: string | null
  gender: string | null
  time_start: string | null
  time_end: string | null
  days_of_week: string[]
  coach_name?: string
  status?: 'P' | 'C' | 'H' | 'N' | 'R' | null
}

interface Props {
  slots: ClassSlot[]
  showCoach?: boolean
  showClub?: boolean
}

const STATUS_COLOR: Record<string, string> = {
  P: 'border-l-green-500 bg-green-500/10',
  C: 'border-l-amber-500 bg-amber-500/10',
  H: 'border-l-blue-500 bg-blue-500/10',
  N: 'border-l-gray-500 bg-gray-500/10',
  R: 'border-l-purple-500 bg-purple-500/10',
}

function getTodayName(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' })
}

export default function WeeklyCalendar({ slots, showCoach, showClub }: Props) {
  const today = getTodayName()

  const slotsByDay: Record<string, ClassSlot[]> = {}
  for (const day of DAYS) slotsByDay[day] = []
  for (const slot of slots) {
    for (const day of slot.days_of_week) {
      if (DAYS.includes(day)) slotsByDay[day].push(slot)
    }
  }

  for (const day of DAYS) {
    slotsByDay[day].sort((a, b) => (a.time_start ?? '').localeCompare(b.time_start ?? ''))
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-6 gap-2 min-w-[640px]">
        {DAYS.map(day => {
          const isToday = day === today
          return (
            <div key={day} className={cn('rounded-xl overflow-hidden', isToday ? 'ring-2 ring-blue-500/50' : '')}>
              {/* Day header */}
              <div className={cn(
                'px-3 py-2 text-center text-xs font-semibold',
                isToday ? 'bg-blue-600 text-white' : 'bg-[#1a1d27] text-slate-400'
              )}>
                {DAY_ABBR[day]}
              </div>

              {/* Slots */}
              <div className="bg-[#0f1117] space-y-1 p-1 min-h-[80px]">
                {slotsByDay[day].length === 0 ? (
                  <div className="text-center text-slate-700 text-xs py-4">—</div>
                ) : (
                  slotsByDay[day].map(slot => (
                    <div
                      key={slot.id + day}
                      className={cn(
                        'border-l-2 rounded-r px-2 py-1.5 text-[11px]',
                        slot.status ? STATUS_COLOR[slot.status] : 'border-l-slate-600 bg-[#1a1d27]'
                      )}
                    >
                      {showClub && <p className="font-semibold text-white truncate">{slot.club_name}</p>}
                      <p className={cn('font-medium truncate', showClub ? 'text-slate-400' : 'text-white')}>
                        {slot.class_identifier ?? slot.class_type ?? 'Class'}
                      </p>
                      <p className="text-slate-500">{formatTimeRange(slot.time_start, slot.time_end)}</p>
                      {showCoach && slot.coach_name && (
                        <p className="text-slate-600 truncate">{slot.coach_name}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
