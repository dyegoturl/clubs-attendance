'use client'

import { useState } from 'react'
import { Building2, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatTimeRange } from '@/lib/utils'

interface Club {
  id: string
  name: string
  region_id: string | null
  is_active: boolean
}

interface ClassRow {
  id: string
  club_id: string
  class_type: string | null
  class_identifier: string | null
  time_start: string | null
  time_end: string | null
  days_of_week: string[] | null
  program_id: string | null
  duration_minutes: number | null
  is_active: boolean
}

interface Region { id: string; name: string }
interface Program { id: string; name: string }

interface Props {
  clubs: Club[]
  classes: ClassRow[]
  regions: Region[]
  programs: Program[]
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

export default function ClubsManager({ clubs, classes, regions, programs }: Props) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const regionMap = Object.fromEntries(regions.map(r => [r.id, r.name]))
  const programMap = Object.fromEntries(programs.map(p => [p.id, p.name]))

  const classesByClub: Record<string, ClassRow[]> = {}
  for (const c of classes) {
    if (!classesByClub[c.club_id]) classesByClub[c.club_id] = []
    classesByClub[c.club_id].push(c)
  }

  const filtered = clubs.filter(c =>
    (showInactive || c.is_active) &&
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Clubs & Classes</h1>
        <p className="text-sm text-slate-400 mt-0.5">{clubs.filter(c => c.is_active).length} active clubs</p>
      </div>

      <div className="flex gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clubs…"
          className="flex-1 bg-[#1a1d27] border border-[#2e3350] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
        />
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
            className="w-4 h-4 accent-blue-500" />
          Show inactive
        </label>
      </div>

      <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2e3350]">
          <Building2 className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">{filtered.length} club{filtered.length !== 1 ? 's' : ''}</h2>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No clubs found</p>
        ) : (
          <ul className="divide-y divide-[#2e3350]">
            {filtered.map(club => {
              const clubClasses = (classesByClub[club.id] ?? []).filter(c => c.is_active)
              const regionName = club.region_id ? regionMap[club.region_id] : null
              const isOpen = expanded === club.id

              return (
                <li key={club.id}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#22263a] transition-colors text-left"
                    onClick={() => setExpanded(isOpen ? null : club.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{club.name}</p>
                        {!club.is_active && (
                          <span className="text-xs text-slate-500 border border-slate-600 px-1.5 py-0.5 rounded">Inactive</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{regionName ?? 'No region'} · {clubClasses.length} active class{clubClasses.length !== 1 ? 'es' : ''}</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>

                  {isOpen && (
                    <div className="bg-[#0f1117] border-t border-[#2e3350]">
                      {clubClasses.length === 0 ? (
                        <p className="px-6 py-4 text-xs text-slate-500">No active classes</p>
                      ) : (
                        <ul className="divide-y divide-[#1a1d27]">
                          {clubClasses.map(cls => (
                            <li key={cls.id} className="px-6 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm text-white">
                                    {cls.class_identifier ?? cls.class_type}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {cls.time_start && cls.time_end ? formatTimeRange(cls.time_start, cls.time_end) : 'No time'}
                                    {cls.duration_minutes ? ` · ${cls.duration_minutes}min` : ''}
                                  </p>
                                  {cls.days_of_week && cls.days_of_week.length > 0 && (
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {cls.days_of_week.map(d => (
                                        <span key={d} className="text-xs bg-[#1a1d27] border border-[#2e3350] text-slate-400 px-1.5 py-0.5 rounded">
                                          {DAY_LABELS[d] ?? d}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500">{cls.program_id ? (programMap[cls.program_id] ?? cls.program_id) : ''}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
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
