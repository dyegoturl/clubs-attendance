'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Clock, AlertTriangle } from 'lucide-react'
import { cn, formatTimeRange, isLateReport, today } from '@/lib/utils'
import { ATTENDANCE_CODES } from '@/lib/constants'
import type { ActiveCoachAssignment, AttendanceStatus } from '@/types'

const schema = z.object({
  class_id: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(['P', 'C', 'H', 'N', 'R']),
  student_count: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional(),
  is_adhoc: z.boolean(),
})
type FormData = z.infer<typeof schema>

interface Props {
  psNumber: string
  assignments: ActiveCoachAssignment[]
}

export default function AttendanceForm({ psNumber, assignments }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [selectedDate, setSelectedDate] = useState(today())

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: today(), status: 'P' as const, is_adhoc: false },
  })

  const watchStatus = watch('status')
  const watchClassId = watch('class_id')
  const watchDate = watch('date')

  const selectedAssignment = assignments.find(a => a.class_id === watchClassId)
  const requiresStudentCount = selectedAssignment?.requires_student_count && watchStatus === 'P'
  const late = watchDate ? isLateReport(watchDate) : false

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, coach_ps_number: psNumber }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to submit attendance')
        return
      }
      if (json.edit_request) {
        toast.success('Edit request submitted — awaiting supervisor approval')
      } else {
        toast.success('Attendance submitted successfully')
      }
      reset({ date: today(), status: 'P', is_adhoc: false })
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Submit Attendance</h1>
        <p className="text-sm text-slate-400 mt-0.5">Log your class attendance below</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-[#1a1d27] rounded-xl border border-[#2e3350] p-5 space-y-4">

        {/* Class selector */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Class</label>
          <select {...register('class_id')}
            className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">Select a class…</option>
            {assignments.map(a => (
              <option key={a.class_id} value={a.class_id}>
                {a.club_name} · {a.class_identifier ?? a.class_type} · {formatTimeRange(a.time_start, a.time_end)}
              </option>
            ))}
          </select>
          {errors.class_id && <p className="mt-1 text-xs text-red-400">Select a class</p>}
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Date</label>
          <input
            {...register('date')}
            type="date"
            max={today()}
            className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          {late && (
            <div className="mt-1.5 flex items-center gap-1.5 text-orange-400 text-xs">
              <Clock className="w-3.5 h-3.5" />
              This will be flagged as a late report
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Status</label>
          <div className="grid grid-cols-3 gap-2">
            {(['P', 'C', 'H'] as AttendanceStatus[]).map(code => {
              const info = ATTENDANCE_CODES[code]
              const selected = watchStatus === code
              return (
                <button key={code} type="button" onClick={() => setValue('status', code)}
                  className={cn(
                    'py-2.5 rounded-lg text-sm font-semibold border transition-all',
                    selected ? cn(info.bg, info.text, info.border) : 'bg-[#0f1117] border-[#2e3350] text-slate-500 hover:border-slate-500'
                  )}>
                  {code} · {info.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Student count — MOI only */}
        {requiresStudentCount && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              Number of Students <span className="text-red-400">*</span>
            </label>
            <input
              {...register('student_count', { valueAsNumber: true })}
              type="number"
              min={0}
              placeholder="0"
              className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">Required for MOI classes when present</p>
            {errors.student_count && <p className="mt-1 text-xs text-red-400">Enter number of students</p>}
          </div>
        )}

        {/* Ad-hoc toggle */}
        <div className="flex items-center gap-3">
          <input {...register('is_adhoc')} type="checkbox" id="is_adhoc"
            className="w-4 h-4 rounded border-[#2e3350] bg-[#0f1117] accent-blue-500" />
          <label htmlFor="is_adhoc" className="text-sm text-slate-300">
            This is an unscheduled (ad-hoc) class
          </label>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Notes (optional)</label>
          <textarea {...register('notes')} rows={2} placeholder="Any relevant notes…"
            className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
        </div>

        <button type="submit" disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitting ? 'Submitting…' : 'Submit Attendance'}
        </button>
      </form>
    </div>
  )
}
