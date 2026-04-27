'use client'

import Link from 'next/link'
import { AlertCircle, CheckCircle2, XCircle, Clock, TrendingUp, CalendarCheck } from 'lucide-react'
import { cn, formatTimeRange } from '@/lib/utils'
import { ATTENDANCE_CODES } from '@/lib/constants'
import WeeklyCalendar from '@/components/shared/WeeklyCalendar'
import type { DailyAttendanceStatus } from '@/types'

interface WeekSlot {
  id: string
  class_identifier: string | null
  class_type: string | null
  gender: string | null
  time_start: string | null
  time_end: string | null
  days_of_week: string[]
  club_name: string
  status?: 'P' | 'C' | 'H' | 'N' | 'R' | null
}

interface Props {
  psNumber: string
  coachName: string
  todayClasses: DailyAttendanceStatus[]
  pendingCount: number
  monthStats: { present: number; cancelled: number; lateReports: number }
  weekSlots: WeekSlot[]
}

export default function CoachDashboard({ psNumber, coachName, todayClasses, pendingCount, monthStats, weekSlots }: Props) {
  const today = new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' })
  const submittedToday = todayClasses.filter(c => c.attendance_id).length
  const totalToday = todayClasses.length

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Pending Banner */}
      {pendingCount > 0 && (
        <Link href="/coach/attendance?view=pending"
          className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 hover:bg-red-500/15 transition-colors">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">
              {pendingCount} pending {pendingCount === 1 ? 'day' : 'days'} need attention
            </p>
            <p className="text-xs text-red-400/80">Tap to resolve before accessing the dashboard</p>
          </div>
          <span className="ml-auto text-red-400 text-xs">Fix now →</span>
        </Link>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Welcome, {coachName.split(' ')[0]}</h1>
        <p className="text-sm text-slate-400 mt-0.5">{today}</p>
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Present', value: monthStats.present, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Cancelled', value: monthStats.cancelled, icon: XCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Late Reports', value: monthStats.lateReports, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={cn('rounded-xl border p-4 text-center', bg)}>
            <Icon className={cn('w-5 h-5 mx-auto mb-1', color)} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Today's Classes */}
      <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e3350]">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Today's Classes</h2>
          </div>
          <span className="text-xs text-slate-400">{submittedToday} / {totalToday} submitted</span>
        </div>

        {totalToday === 0 ? (
          <div className="px-4 py-8 text-center">
            <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No classes scheduled today</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#2e3350]">
            {todayClasses.map((cls) => {
              const code = cls.status
              const info = code ? ATTENDANCE_CODES[code] : null
              return (
                <li key={cls.class_id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {cls.club_name}
                        {cls.class_identifier ? ` · ${cls.class_identifier}` : ''}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatTimeRange(cls.time_start, cls.time_end)} · {cls.class_type}
                      </p>
                      <p className="text-xs text-slate-500">{cls.region_name} · {cls.program_name}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {info ? (
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border', info.bg, info.text, info.border)}>
                          {info.label}
                        </span>
                      ) : (
                        <Link href={`/coach/attendance?class=${cls.class_id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors">
                          Submit
                        </Link>
                      )}
                    </div>
                  </div>
                  {cls.student_count != null && (
                    <p className="text-xs text-slate-500 mt-1">👥 {cls.student_count} students</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Weekly calendar */}
      <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2e3350]">
          <h2 className="text-sm font-semibold text-white">This Week</h2>
        </div>
        <div className="p-3">
          <WeeklyCalendar slots={weekSlots} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/coach/attendance"
          className="flex items-center gap-3 bg-blue-600/20 border border-blue-500/30 rounded-xl p-4 hover:bg-blue-600/30 transition-colors">
          <CalendarCheck className="w-5 h-5 text-blue-400" />
          <div>
            <p className="text-sm font-semibold text-white">Log Attendance</p>
            <p className="text-xs text-slate-400">Submit for a class</p>
          </div>
        </Link>
        <Link href="/coach/history"
          className="flex items-center gap-3 bg-[#1a1d27] border border-[#2e3350] rounded-xl p-4 hover:bg-[#22263a] transition-colors">
          <TrendingUp className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-sm font-semibold text-white">My History</p>
            <p className="text-xs text-slate-400">View all records</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
