'use client'

import { useState } from 'react'
import { Building2, Clock, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
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
  gender: string | null
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

const TYPE_STYLE: Record<string, { label: string; className: string }> = {
  'Kids and Youth':       { label: 'Kids & Youth',       className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  'Juvenile and Adults':  { label: 'Juvenile & Adults',  className: 'bg-purple-500/10  text-purple-400  border-purple-500/20'  },
}

const GENDER_STYLE: Record<string, { label: string; className: string }> = {
  Male:   { label: 'Male',   className: 'bg-blue-500/10  text-blue-400  border-blue-500/20'  },
  Female: { label: 'Female', className: 'bg-pink-500/10  text-pink-400  border-pink-500/20'  },
  Mix:    { label: 'Mix',    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
}

function TypeBadge({ value }: { value: string | null }) {
  if (!value) return null
  const s = TYPE_STYLE[value]
  if (!s) return <span className="text-xs border rounded px-1.5 py-0.5 text-slate-400 border-slate-600">{value}</span>
  return <span className={cn('text-xs border rounded px-1.5 py-0.5 font-medium', s.className)}>{s.label}</span>
}

function GenderBadge({ value }: { value: string | null }) {
  if (!value) return null
  const s = GENDER_STYLE[value]
  if (!s) return null
  return <span className={cn('text-xs border rounded px-1.5 py-0.5 font-medium', s.className)}>{s.label}</span>
}

export default function ClubsManager({ clubs, classes, regions, programs }: Props) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const regionMap = Object.fromEntries(regions.map(r => [r.id, r.name]))

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
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Clubs & Classes</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {clubs.filter(c => c.is_active).length} active clubs · {classes.filter(c => c.is_active).length} active classes
        </p>
      </div>

      <div className="flex gap-3 items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clubs…"
          className="flex-1 bg-[#1a1d27] border border-[#2e3350] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
        />
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
            className="w-4 h-4 accent-blue-500" />
          Show inactive
        </label>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-400">Type:</span>
          <span className={cn('border rounded px-1.5 py-0.5 font-medium', TYPE_STYLE['Kids and Youth'].className)}>Kids & Youth</span>
          <span className={cn('border rounded px-1.5 py-0.5 font-medium', TYPE_STYLE['Juvenile and Adults'].className)}>Juvenile & Adults</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-400">Gender:</span>
          <span className={cn('border rounded px-1.5 py-0.5 font-medium', GENDER_STYLE.Male.className)}>Male</span>
          <span className={cn('border rounded px-1.5 py-0.5 font-medium', GENDER_STYLE.Female.className)}>Female</span>
          <span className={cn('border rounded px-1.5 py-0.5 font-medium', GENDER_STYLE.Mix.className)}>Mix</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#1a1d27] border border-[#2e3350] rounded-xl px-4 py-10 text-center text-sm text-slate-500">
          No clubs found
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(club => {
            const allClubClasses = classesByClub[club.id] ?? []
            const activeClasses = allClubClasses.filter(c => c.is_active)
            const regionName = club.region_id ? regionMap[club.region_id] : null
            const isOpen = expanded === club.id

            return (
              <div key={club.id} className="bg-[#1a1d27] border border-[#2e3350] rounded-xl overflow-hidden">
                {/* Club header */}
                <button
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#22263a] transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? null : club.id)}
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{club.name}</p>
                      {!club.is_active && (
                        <span className="text-[10px] font-semibold text-slate-500 border border-slate-600 px-1.5 py-0.5 rounded">INACTIVE</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {regionName && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="w-3 h-3" />{regionName}
                        </span>
                      )}
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-slate-400">
                        {activeClasses.length} class{activeClasses.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  </div>
                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                </button>

                {/* Classes panel */}
                {isOpen && (
                  <div className="border-t border-[#2e3350]">
                    {activeClasses.length === 0 ? (
                      <p className="px-5 py-4 text-xs text-slate-500">No active classes</p>
                    ) : (
                      <div className="divide-y divide-[#2e3350]">
                        {activeClasses.map(cls => (
                          <div key={cls.id} className="px-5 py-3.5 flex items-start gap-4">
                            {/* Left: identifier + badges */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <p className="text-sm font-medium text-white">
                                {cls.class_identifier ?? 'Class'}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                <TypeBadge value={cls.class_type} />
                                <GenderBadge value={cls.gender} />
                              </div>
                            </div>

                            {/* Right: time */}
                            {(cls.time_start || cls.time_end) && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0 mt-0.5">
                                <Clock className="w-3.5 h-3.5" />
                                {formatTimeRange(cls.time_start, cls.time_end)}
                                {cls.duration_minutes && (
                                  <span className="text-slate-500">· {cls.duration_minutes}min</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
