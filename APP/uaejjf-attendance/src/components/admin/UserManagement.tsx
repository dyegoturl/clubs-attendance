'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Users, UserCheck, ChevronDown, ChevronUp, Mail, Phone, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Coach {
  ps_number: string
  name: string
  email: string | null
  date_of_birth: string | null
  gender: string | null
  active: boolean
  project: string | null
  sheet_supervisor: string | null
  assignment_supervisor: string | null
}

interface Supervisor {
  id: string
  name: string
  email: string | null
  whatsapp: string | null
}

interface Props {
  coaches: Coach[]
  supervisors: Supervisor[]
}

type Tab = 'coaches' | 'supervisors'

export default function UserManagement({ coaches, supervisors }: Props) {
  const [tab, setTab] = useState<Tab>('coaches')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [resettingPw, setResettingPw] = useState<string | null>(null)

  // Filter state
  const [filterProject, setFilterProject] = useState('')
  const [filterSupervisor, setFilterSupervisor] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active')
  const [filterAssignment, setFilterAssignment] = useState<'all' | 'assigned' | 'unassigned'>('all')

  const projects = useMemo(() =>
    Array.from(new Set(coaches.map(c => c.project).filter(Boolean))).sort() as string[],
    [coaches]
  )
  const sheetSupervisors = useMemo(() =>
    Array.from(new Set(coaches.map(c => c.sheet_supervisor).filter(Boolean))).sort() as string[],
    [coaches]
  )

  const filteredCoaches = useMemo(() => coaches.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.ps_number.toLowerCase().includes(search.toLowerCase())) return false
    if (filterProject && c.project !== filterProject) return false
    if (filterSupervisor && c.sheet_supervisor !== filterSupervisor) return false
    if (filterStatus === 'active' && !c.active) return false
    if (filterStatus === 'inactive' && c.active) return false
    if (filterAssignment === 'assigned' && !c.assignment_supervisor) return false
    if (filterAssignment === 'unassigned' && c.assignment_supervisor) return false
    return true
  }), [coaches, search, filterProject, filterSupervisor, filterStatus, filterAssignment])

  const filteredSupervisors = supervisors.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = coaches.filter(c => c.active).length
  const unassignedCount = coaches.filter(c => c.active && !c.assignment_supervisor).length

  async function resetPassword(psNumber: string, dob: string | null) {
    if (!dob) { toast.error('No date of birth — cannot reset password'); return }
    setResettingPw(psNumber)
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ps_number: psNumber }),
      })
      if (!res.ok) { toast.error('Failed to reset password'); return }
      toast.success(`Password reset to default for ${psNumber}`)
    } catch { toast.error('Network error') }
    finally { setResettingPw(null) }
  }

  function clearFilters() {
    setFilterProject('')
    setFilterSupervisor('')
    setFilterStatus('active')
    setFilterAssignment('all')
    setSearch('')
  }

  const hasFilters = filterProject || filterSupervisor || filterStatus !== 'active' || filterAssignment !== 'all' || search

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white">User Management</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {activeCount} active coaches · {unassignedCount} unassigned · {supervisors.length} supervisors
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex bg-[#1a1d27] border border-[#2e3350] rounded-xl p-1 gap-1 max-w-sm">
        {(['coaches', 'supervisors'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize',
              tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            )}>
            {t === 'coaches' ? `Coaches (${coaches.length})` : `Supervisors (${supervisors.length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or PS number…"
        className="w-full bg-[#1a1d27] border border-[#2e3350] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
      />

      {/* Coach filters */}
      {tab === 'coaches' && (
        <div className="bg-[#1a1d27] border border-[#2e3350] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium uppercase tracking-wide">
            <Filter className="w-3.5 h-3.5" />
            Filters
            {hasFilters && (
              <button onClick={clearFilters} className="ml-auto text-blue-400 hover:text-blue-300 normal-case tracking-normal">
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Project */}
            <select
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
              className="bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Supervisor (from sheet) */}
            <select
              value={filterSupervisor}
              onChange={e => setFilterSupervisor(e.target.value)}
              className="bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Supervisors</option>
              {sheetSupervisors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Active status */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="all">All Status</option>
            </select>

            {/* Assignment status */}
            <select
              value={filterAssignment}
              onChange={e => setFilterAssignment(e.target.value as 'all' | 'assigned' | 'unassigned')}
              className="bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Assignments</option>
              <option value="unassigned">Unassigned</option>
              <option value="assigned">Assigned</option>
            </select>
          </div>
          <p className="text-xs text-slate-500">{filteredCoaches.length} of {coaches.length} coaches shown</p>
        </div>
      )}

      {/* Coaches list */}
      {tab === 'coaches' && (
        <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2e3350]">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Coaches</h2>
            <span className="ml-auto text-xs text-slate-500">{filteredCoaches.length} results</span>
          </div>
          {filteredCoaches.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No coaches match the current filters</p>
          ) : (
            <ul className="divide-y divide-[#2e3350]">
              {filteredCoaches.map(coach => (
                <li key={coach.ps_number}>
                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#22263a] transition-colors text-left"
                    onClick={() => setExpanded(expanded === coach.ps_number ? null : coach.ps_number)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{coach.name}</p>
                        {!coach.active && (
                          <span className="flex-shrink-0 text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 rounded px-1.5 py-0.5">INACTIVE</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {coach.ps_number}
                        {coach.project && <span className="ml-1.5 text-blue-400/70">{coach.project}</span>}
                        {coach.sheet_supervisor && <span className="ml-1.5">· {coach.sheet_supervisor}</span>}
                        {!coach.assignment_supervisor && coach.active && <span className="ml-1.5 text-amber-400/80">· Unassigned</span>}
                      </p>
                    </div>
                    {expanded === coach.ps_number ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                  </button>

                  {expanded === coach.ps_number && (
                    <div className="bg-[#0f1117] border-t border-[#2e3350] px-4 py-3 space-y-2">
                      {coach.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Mail className="w-3.5 h-3.5" />{coach.email}
                        </div>
                      )}
                      {coach.date_of_birth && (
                        <p className="text-xs text-slate-400">DOB: {coach.date_of_birth}</p>
                      )}
                      {coach.project && (
                        <p className="text-xs text-slate-400">Project: <span className="text-white">{coach.project}</span></p>
                      )}
                      {coach.sheet_supervisor && (
                        <p className="text-xs text-slate-400">Sheet supervisor: <span className="text-white">{coach.sheet_supervisor}</span></p>
                      )}
                      {coach.assignment_supervisor && (
                        <p className="text-xs text-slate-400">Assigned to: <span className="text-green-400">{coach.assignment_supervisor}</span></p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => resetPassword(coach.ps_number, coach.date_of_birth)}
                          disabled={resettingPw === coach.ps_number}
                          className="text-xs bg-[#1a1d27] border border-[#2e3350] hover:border-slate-500 text-slate-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                          {resettingPw === coach.ps_number ? 'Resetting…' : 'Reset Password'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Supervisors list */}
      {tab === 'supervisors' && (
        <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2e3350]">
            <UserCheck className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Supervisors</h2>
          </div>
          {filteredSupervisors.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No supervisors found</p>
          ) : (
            <ul className="divide-y divide-[#2e3350]">
              {filteredSupervisors.map(sup => (
                <li key={sup.id}>
                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#22263a] transition-colors text-left"
                    onClick={() => setExpanded(expanded === sup.id ? null : sup.id)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{sup.name}</p>
                      <p className="text-xs text-slate-400">{sup.email ?? 'No email'}</p>
                    </div>
                    {expanded === sup.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {expanded === sup.id && (
                    <div className="bg-[#0f1117] border-t border-[#2e3350] px-4 py-3 space-y-1.5">
                      {sup.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Mail className="w-3.5 h-3.5" /> {sup.email}
                        </div>
                      )}
                      {sup.whatsapp && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Phone className="w-3.5 h-3.5" /> {sup.whatsapp}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
