'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { DollarSign, Plus, Check, X } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface Rate {
  id: string
  class_id: string | null
  program_id: string | null
  rate_per_hour: number
  effective_from: string
  effective_to: string | null
}

interface ClassRow {
  id: string
  club_id: string
  class_type: string | null
  class_identifier: string | null
  program_id: string | null
}

interface Program { id: string; name: string }
interface Club { id: string; name: string }

interface Props {
  rates: Rate[]
  classes: ClassRow[]
  programs: Program[]
  clubs: Club[]
}

export default function RatesManager({ rates: initialRates, classes, programs, clubs }: Props) {
  const [rates, setRates] = useState(initialRates)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    class_id: '',
    program_id: '',
    rate_per_hour: '',
    effective_from: new Date().toISOString().split('T')[0],
  })

  const programMap = Object.fromEntries(programs.map(p => [p.id, p.name]))
  const clubMap = Object.fromEntries(clubs.map(c => [c.id, c.name]))
  const classMap = Object.fromEntries(classes.map(c => [c.id, c]))

  async function saveRate() {
    if (!form.rate_per_hour || !form.effective_from) {
      toast.error('Fill in rate and effective date')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: form.class_id || null,
          program_id: form.program_id || null,
          rate_per_hour: Number(form.rate_per_hour),
          effective_from: form.effective_from,
        }),
      })
      if (!res.ok) { toast.error('Failed to save rate'); return }
      const { data } = await res.json()
      if (data) setRates(prev => [data, ...prev])
      toast.success('Rate saved')
      setAdding(false)
      setForm({ class_id: '', program_id: '', rate_per_hour: '', effective_from: new Date().toISOString().split('T')[0] })
    } catch { toast.error('Network error') }
    finally { setSaving(false) }
  }

  function describeRate(r: Rate) {
    if (r.class_id) {
      const cls = classMap[r.class_id]
      if (cls) {
        const club = clubMap[cls.club_id]
        return `${club ?? 'Unknown'} · ${cls.class_identifier ?? cls.class_type}`
      }
    }
    if (r.program_id) return `Program: ${programMap[r.program_id] ?? r.program_id}`
    return 'Default rate'
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Class Rates</h1>
          <p className="text-sm text-slate-400 mt-0.5">Private — coaches cannot see these rates</p>
        </div>
        <button onClick={() => setAdding(!adding)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Rate
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-[#1a1d27] border border-blue-500/30 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">New Rate</h3>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Specific Class (optional)</label>
            <select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}
              className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="">All classes / Program-wide</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {clubMap[c.club_id] ?? c.club_id} · {c.class_identifier ?? c.class_type}
                </option>
              ))}
            </select>
          </div>

          {!form.class_id && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Program</label>
              <select value={form.program_id} onChange={e => setForm(f => ({ ...f, program_id: e.target.value }))}
                className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="">Default (all programs)</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Rate per Hour (AED)</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={form.rate_per_hour}
                onChange={e => setForm(f => ({ ...f, rate_per_hour: e.target.value }))}
                placeholder="0.00"
                className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Effective From</label>
              <input
                type="date"
                value={form.effective_from}
                onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))}
                className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={saveRate} disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
              <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Rate'}
            </button>
            <button onClick={() => setAdding(false)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#0f1117] border border-[#2e3350] text-slate-300 text-sm py-2 rounded-lg hover:border-slate-500 transition-colors">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rates table */}
      <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2e3350]">
          <DollarSign className="w-4 h-4 text-yellow-400" />
          <h2 className="text-sm font-semibold text-white">Current Rates</h2>
        </div>

        {rates.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-500">No rates configured yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#2e3350]">
            {rates.map(r => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{describeRate(r)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      From {formatDate(r.effective_from)}
                      {r.effective_to ? ` · Until ${formatDate(r.effective_to)}` : ' · Current'}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-yellow-400">AED {r.rate_per_hour}/hr</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
