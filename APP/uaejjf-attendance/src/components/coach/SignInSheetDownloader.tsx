'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { formatTimeRange } from '@/lib/utils'

interface Assignment {
  class_id: string
  club_name: string
  class_identifier: string | null
  class_type: string | null
  time_start: string | null
  time_end: string | null
}

interface Props {
  psNumber: string
  assignments: Assignment[]
}

function monthOptions() {
  const opts = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-AE', { month: 'long', year: 'numeric' })
    opts.push({ val, label })
  }
  return opts
}

export default function SignInSheetDownloader({ psNumber, assignments }: Props) {
  const [classId, setClassId] = useState(assignments[0]?.class_id ?? '')
  const [month, setMonth] = useState(monthOptions()[0].val)

  function download() {
    const url = `/api/coach/sign-in-sheet?class_id=${classId}&month=${month}&ps_number=${psNumber}`
    window.open(url, '_blank')
  }

  if (assignments.length === 0) {
    return (
      <div className="max-w-md">
        <h1 className="text-xl font-bold text-white mb-2">Sign-In Sheet</h1>
        <p className="text-sm text-slate-400">No active class assignments found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-md space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Sign-In Sheet</h1>
        <p className="text-sm text-slate-400 mt-0.5">Download your pre-filled sign-in sheet, sign it, and upload it back.</p>
      </div>

      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Class</label>
          <select value={classId} onChange={e => setClassId(e.target.value)}
            className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
            {assignments.map(a => (
              <option key={a.class_id} value={a.class_id}>
                {a.club_name} · {a.class_identifier ?? a.class_type} {formatTimeRange(a.time_start, a.time_end) ? `(${formatTimeRange(a.time_start, a.time_end)})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Month</label>
          <select value={month} onChange={e => setMonth(e.target.value)}
            className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
            {monthOptions().map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>
        <button onClick={download}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors">
          <FileDown className="w-4 h-4" />
          Download Sign-In Sheet
        </button>
      </div>

      <p className="text-xs text-slate-500">
        The sheet opens in a new tab. Use your browser's Print function (⌘P) to save as PDF.
      </p>
    </div>
  )
}
