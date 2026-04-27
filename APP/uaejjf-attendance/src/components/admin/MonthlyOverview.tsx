'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

interface ClassSummary {
  class_id: string
  club_name: string
  class_identifier: string | null
  class_type: string | null
  gender: string | null
  region_name: string | null
  projeto_name: string | null
  expected: number
  reported: number
  breakdown: Record<string, number>
  total_students: number
}

interface Props {
  summaries: ClassSummary[]
  month: string
  projetos: string[]
  regions: string[]
}

export default function MonthlyOverview({ summaries, month, projetos, regions }: Props) {
  const [filterProjeto, setFilterProjeto] = useState('')
  const [filterRegion, setFilterRegion] = useState('')

  const filtered = useMemo(() => summaries.filter(s => {
    if (filterProjeto && s.projeto_name !== filterProjeto) return false
    if (filterRegion && s.region_name !== filterRegion) return false
    return true
  }), [summaries, filterProjeto, filterRegion])

  const totalExpected = filtered.reduce((a, b) => a + b.expected, 0)
  const totalReported = filtered.reduce((a, b) => a + b.reported, 0)
  const overallRate = totalExpected > 0 ? Math.round((totalReported / totalExpected) * 100) : 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Monthly Overview</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {month} · {totalReported}/{totalExpected} slots reported ({overallRate}% compliance)
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={filterProjeto} onChange={e => setFilterProjeto(e.target.value)}
          className="bg-[#1a1d27] border border-[#2e3350] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
          <option value="">All Projects</option>
          {projetos.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
          className="bg-[#1a1d27] border border-[#2e3350] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
          <option value="">All Regions</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-[#2e3350] text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Club / Class</th>
              <th className="px-4 py-3 text-center">Expected</th>
              <th className="px-4 py-3 text-center">Reported</th>
              <th className="px-4 py-3 text-center">Rate</th>
              <th className="px-4 py-3 text-center">Students</th>
              <th className="px-4 py-3 text-left">Breakdown</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2e3350]">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No data for this period</td></tr>
            ) : filtered.map(s => {
              const rate = s.expected > 0 ? Math.round((s.reported / s.expected) * 100) : 0
              return (
                <tr key={s.class_id} className="hover:bg-[#22263a] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{s.club_name}</p>
                    <p className="text-xs text-slate-400">{s.class_identifier ?? s.class_type} · {s.gender}</p>
                    {s.region_name && <p className="text-xs text-slate-600">{s.region_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-300">{s.expected}</td>
                  <td className="px-4 py-3 text-center text-slate-300">{s.reported}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('font-semibold', rate >= 90 ? 'text-green-400' : rate >= 70 ? 'text-amber-400' : 'text-red-400')}>
                      {rate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-300">{s.total_students || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 text-xs flex-wrap">
                      {(s.breakdown.P ?? 0) > 0 && <span className="text-green-400">P:{s.breakdown.P}</span>}
                      {(s.breakdown.N ?? 0) > 0 && <span className="text-gray-400">Sick:{s.breakdown.N}</span>}
                      {(s.breakdown.R ?? 0) > 0 && <span className="text-purple-400">Rep:{s.breakdown.R}</span>}
                      {(s.breakdown.C ?? 0) > 0 && <span className="text-amber-400">Can:{s.breakdown.C}</span>}
                      {(s.breakdown.H ?? 0) > 0 && <span className="text-blue-400">Tour:{s.breakdown.H}</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
