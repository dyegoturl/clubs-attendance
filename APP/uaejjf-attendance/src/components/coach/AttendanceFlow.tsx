'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Loader2, ChevronRight } from 'lucide-react'
import { cn, formatTimeRange } from '@/lib/utils'
import { ABSENCE_REASONS } from '@/lib/constants'
import type { DailyAttendanceStatus } from '@/types'

interface Props {
  psNumber: string
  pendingSlots: DailyAttendanceStatus[]
  proxyFor?: string  // ps_number — set when supervisor/admin submits on behalf
}

type Step = 'action' | 'reason' | 'count' | 'done'

export default function AttendanceFlow({ psNumber, pendingSlots, proxyFor }: Props) {
  const [idx, setIdx] = useState(0)
  const [step, setStep] = useState<Step>('action')
  const [count, setCount] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const slot = pendingSlots[idx]
  const progress = `${idx + 1} / ${pendingSlots.length}`

  if (pendingSlots.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-16">
        <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">All done for today!</h2>
        <p className="text-sm text-slate-400">No pending attendance to submit.</p>
      </div>
    )
  }

  if (step === 'done') {
    const remaining = pendingSlots.length - idx - 1
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-16">
        <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Submitted!</h2>
        {remaining > 0 ? (
          <button
            onClick={() => { setIdx(i => i + 1); setStep('action'); setCount('') }}
            className="flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Next class <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <p className="text-sm text-slate-400">All classes submitted for today.</p>
        )}
      </div>
    )
  }

  async function submit(status: 'P' | 'N' | 'R' | 'C' | 'H', studentCount: number | null) {
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        class_id: slot.class_id,
        date: slot.today,
        status,
        student_count: studentCount,
        coach_ps_number: proxyFor ?? psNumber,
        is_adhoc: false,
      }
      if (proxyFor) body.proxy_by = psNumber

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error ?? 'Failed to submit')
        return
      }
      setStep('done')
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  function handlePresente() {
    if (slot.requires_student_count) {
      setStep('count')
    } else {
      submit('P', null)
    }
  }

  function handleAusente() {
    setStep('reason')
  }

  function handleReason(code: 'N' | 'R' | 'C' | 'H') {
    submit(code, null)
  }

  function handleCountSubmit() {
    const n = parseInt(count, 10)
    if (isNaN(n) || n < 0) { toast.error('Enter a valid number'); return }
    submit('P', n)
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Class {progress}</span>
        <span>{slot.today}</span>
      </div>

      {/* Class card */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-6 space-y-3">
        <p className="text-lg font-bold text-white">{slot.club_name}</p>
        <p className="text-sm text-slate-400">
          {slot.class_identifier ?? slot.class_type} · {formatTimeRange(slot.time_start, slot.time_end)}
        </p>
        <p className="text-xs text-slate-500">{slot.region_name}</p>
      </div>

      {/* Step: action */}
      {step === 'action' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePresente}
            disabled={submitting}
            className="flex flex-col items-center justify-center gap-2 bg-green-500/20 border-2 border-green-500/40 hover:bg-green-500/30 text-green-400 rounded-2xl py-8 font-bold text-base transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-8 h-8" />}
            Estou Presente
          </button>
          <button
            onClick={handleAusente}
            disabled={submitting}
            className="flex flex-col items-center justify-center gap-2 bg-red-500/20 border-2 border-red-500/40 hover:bg-red-500/30 text-red-400 rounded-2xl py-8 font-bold text-base transition-all disabled:opacity-50"
          >
            <XCircle className="w-8 h-8" />
            Ausente
          </button>
        </div>
      )}

      {/* Step: count (numeric keypad) */}
      {step === 'count' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 text-center">How many students attended?</p>
          <div className="bg-[#0f1117] border border-[#2e3350] rounded-xl px-4 py-3 text-center">
            <span className="text-4xl font-bold text-white">{count || '0'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
              <button
                key={i}
                onClick={() => {
                  if (k === '⌫') setCount(c => c.slice(0, -1))
                  else if (k === '') return
                  else setCount(c => c.length < 3 ? c + k : c)
                }}
                className={cn(
                  'py-4 rounded-xl text-xl font-semibold transition-colors',
                  k === '' ? 'invisible' :
                  k === '⌫' ? 'bg-[#1a1d27] border border-[#2e3350] text-slate-400 hover:text-white' :
                  'bg-[#1a1d27] border border-[#2e3350] text-white hover:bg-[#22263a]'
                )}
              >
                {k}
              </button>
            ))}
          </div>
          <button
            onClick={handleCountSubmit}
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Confirmar Presença
          </button>
        </div>
      )}

      {/* Step: reason */}
      {step === 'reason' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400 text-center">Motivo da ausência</p>
          {ABSENCE_REASONS.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => handleReason(code)}
              disabled={submitting}
              className="w-full bg-[#1a1d27] border border-[#2e3350] hover:bg-[#22263a] text-white text-sm font-semibold py-4 rounded-xl transition-colors disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
