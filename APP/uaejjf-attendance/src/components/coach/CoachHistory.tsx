'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, AlertTriangle, CalendarDays } from 'lucide-react'
import { cn, formatDate, formatTimeRange } from '@/lib/utils'
import { ATTENDANCE_CODES } from '@/lib/constants'
import type { AttendanceStatus } from '@/types'

interface Record {
  id: string
  class_id: string
  date: string
  status: string
  student_count: number | null
  notes: string | null
  is_late_report: boolean | null
  is_adhoc: boolean | null
  submitted_at: string | null
}

interface Assignment {
  class_id: string
  club_name: string
  class_type: string
  class_identifier: string | null
  time_start: string | null
  time_end: string | null
  program_name: string
}

interface Props {
  psNumber: string
  records: Record[]
  assignments: Assignment[]
  year: number
  month: number
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function CoachHistory({ psNumber, records, assignments, year, month }: Props) {
  const router = useRouter()
  const [selectedYear, setSelectedYear] = useState(year)
  const [selectedMonth, setSelectedMonth] = useState(month)

  const assignmentMap = Object.fromEntries(assignments.map(a => [a.class_id, a]))

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear]

  function navigate(y: number, m: number) {
    setSelectedYear(y)
    setSelectedMonth(m)
    router.push(`/coach/history?year=${y}&month=${m}`)
    router.refresh()
  }

  const present = records.filter(r => r.status === 'P').length
  const cancelled = records.filter(r => r.status === 'C').length
  const lateReports = records.filter(r => r.is_late_report).length

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">My Attendance History</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your submitted records by month</p>
      </div>

      {/* Month/Year picker */}
      <div className="flex gap-2">
        <select
          value={selectedMonth}
          onChange={e => navigate(selectedYear, Number(e.target.value))}
          className="bg-[#1a1d27] border border-[#2e3350] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={e => navigate(Number(e.target.value), selectedMonth)}
          className="bg-[#1a1d27] border border-[#2e3350] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Present', value: present, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Cancelled', value: cancelled, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Late Reports', value: lateReports, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={cn('rounded-xl border p-4 text-center', bg)}>
            <p className={cn('text-2xl font-bold', color)}>{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Records list */}
      <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2e3350]">
          <CalendarDays className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </h2>
          <span className="ml-auto text-xs text-slate-400">{records.length} records</span>
        </div>

        {records.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-500">No records for this month</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#2e3350]">
            {records.map(r => {
              const info = ATTENDANCE_CODES[r.status as AttendanceStatus]
              const cls = assignmentMap[r.class_id]
              return (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white">
                          {formatDate(r.date)}
                        </p>
                        {r.is_late_report && (
                          <span className="flex items-center gap-1 text-orange-400 text-xs">
                            <Clock className="w-3 h-3" /> Late Report
                          </span>
                        )}
                        {r.is_adhoc && (
                          <span className="text-xs text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded">Ad-hoc</span>
                        )}
                      </div>
                      {cls ? (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {cls.club_name} · {cls.class_identifier ?? cls.class_type}
                          {cls.time_start && cls.time_end ? ` · ${formatTimeRange(cls.time_start, cls.time_end)}` : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 mt-0.5">Class #{r.class_id.slice(0, 8)}</p>
                      )}
                      {r.student_count != null && (
                        <p className="text-xs text-slate-500 mt-0.5">👥 {r.student_count} students</p>
                      )}
                      {r.notes && (
                        <p className="text-xs text-slate-500 mt-0.5 italic">"{r.notes}"</p>
                      )}
                    </div>
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0',
                      info?.bg, info?.text, info?.border
                    )}>
                      {info?.label ?? r.status}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
