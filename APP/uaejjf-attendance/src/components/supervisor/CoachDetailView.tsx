'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Clock, CheckCircle2, XCircle, CalendarDays } from 'lucide-react'
import { cn, formatDate, formatTimeRange } from '@/lib/utils'
import { ATTENDANCE_CODES } from '@/lib/constants'
import type { AttendanceStatus } from '@/types'

interface AttendanceRecord {
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
  coach: { ps_number: string; name: string; email: string | null }
  records: AttendanceRecord[]
  assignments: Assignment[]
  year: number
  month: number
  supervisorId: string
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function CoachDetailView({ coach, records, assignments, year, month, supervisorId }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('P')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [localRecords, setLocalRecords] = useState(records)

  const assignmentMap = Object.fromEntries(assignments.map(a => [a.class_id, a]))
  const present = localRecords.filter(r => r.status === 'P').length
  const late = localRecords.filter(r => r.is_late_report).length

  function startEdit(r: AttendanceRecord) {
    setEditingId(r.id)
    setEditStatus(r.status as AttendanceStatus)
    setEditNotes(r.notes ?? '')
  }

  async function saveEdit(record: AttendanceRecord) {
    setSaving(true)
    try {
      const res = await fetch('/api/supervisor/edit-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance_id: record.id,
          status: editStatus,
          notes: editNotes,
          supervisor_id: supervisorId,
        }),
      })
      if (!res.ok) { toast.error('Failed to update'); return }
      toast.success('Record updated')
      setLocalRecords(prev => prev.map(r =>
        r.id === record.id ? { ...r, status: editStatus, notes: editNotes } : r
      ))
      setEditingId(null)
    } catch { toast.error('Network error') }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/supervisor/coaches" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">{coach.name}</h1>
          <p className="text-sm text-slate-400">PS {coach.ps_number}</p>
        </div>
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Present', value: present, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: CheckCircle2 },
          { label: 'Total Records', value: localRecords.length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: CalendarDays },
          { label: 'Late Reports', value: late, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: Clock },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className={cn('rounded-xl border p-4 text-center', bg)}>
            <Icon className={cn('w-5 h-5 mx-auto mb-1', color)} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Records */}
      <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e3350]">
          <h2 className="text-sm font-semibold text-white">
            {MONTHS[month - 1]} {year} — {localRecords.length} records
          </h2>
        </div>

        {localRecords.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-500">No records this month</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#2e3350]">
            {localRecords.map(r => {
              const info = ATTENDANCE_CODES[r.status as AttendanceStatus]
              const cls = assignmentMap[r.class_id]
              const isEditing = editingId === r.id

              return (
                <li key={r.id} className="px-4 py-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400">{formatDate(r.date)} — editing</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['P', 'C', 'H', 'N', 'R'] as AttendanceStatus[]).map(code => {
                          const ci = ATTENDANCE_CODES[code]
                          return (
                            <button key={code} onClick={() => setEditStatus(code)}
                              className={cn(
                                'py-2 rounded-lg text-xs font-semibold border transition-all',
                                editStatus === code
                                  ? cn(ci.bg, ci.text, ci.border)
                                  : 'bg-[#0f1117] border-[#2e3350] text-slate-500'
                              )}>
                              {code} · {ci.label}
                            </button>
                          )
                        })}
                      </div>
                      <textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        rows={2}
                        placeholder="Notes…"
                        className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(r)} disabled={saving}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="flex-1 bg-[#0f1117] border border-[#2e3350] text-slate-300 text-sm py-2 rounded-lg transition-colors hover:border-slate-500">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-white">{formatDate(r.date)}</p>
                          {r.is_late_report && (
                            <span className="flex items-center gap-1 text-orange-400 text-xs">
                              <Clock className="w-3 h-3" /> Late
                            </span>
                          )}
                          {r.is_adhoc && (
                            <span className="text-xs text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded">Ad-hoc</span>
                          )}
                        </div>
                        {cls && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {cls.club_name} · {cls.class_identifier ?? cls.class_type}
                            {cls.time_start && cls.time_end ? ` · ${formatTimeRange(cls.time_start, cls.time_end)}` : ''}
                          </p>
                        )}
                        {r.notes && <p className="text-xs text-slate-500 mt-0.5 italic">"{r.notes}"</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border',
                          info?.bg, info?.text, info?.border
                        )}>
                          {info?.label ?? r.status}
                        </span>
                        <button onClick={() => startEdit(r)}
                          className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 border border-[#2e3350] rounded hover:border-slate-500">
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
