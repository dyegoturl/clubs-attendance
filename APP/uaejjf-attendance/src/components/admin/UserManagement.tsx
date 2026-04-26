'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Users, UserCheck, Plus, ChevronDown, ChevronUp, Mail, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Coach {
  ps_number: string
  name: string
  email: string | null
  date_of_birth: string | null
  gender: string | null
  supervisor_name: string | null
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

  const filteredCoaches = coaches.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.ps_number.toLowerCase().includes(search.toLowerCase())
  )
  const filteredSupervisors = supervisors.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

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
      toast.success(`Password reset to default for PS ${psNumber}`)
    } catch { toast.error('Network error') }
    finally { setResettingPw(null) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">User Management</h1>
        <p className="text-sm text-slate-400 mt-0.5">{coaches.length} coaches · {supervisors.length} supervisors</p>
      </div>

      {/* Tab bar */}
      <div className="flex bg-[#1a1d27] border border-[#2e3350] rounded-xl p-1 gap-1">
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

      {/* Coaches list */}
      {tab === 'coaches' && (
        <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2e3350]">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Coaches</h2>
          </div>
          {filteredCoaches.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No coaches found</p>
          ) : (
            <ul className="divide-y divide-[#2e3350]">
              {filteredCoaches.map(coach => (
                <li key={coach.ps_number}>
                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#22263a] transition-colors text-left"
                    onClick={() => setExpanded(expanded === coach.ps_number ? null : coach.ps_number)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{coach.name}</p>
                      <p className="text-xs text-slate-400">PS {coach.ps_number} · {coach.supervisor_name ?? 'Unassigned'}</p>
                    </div>
                    {expanded === coach.ps_number ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>

                  {expanded === coach.ps_number && (
                    <div className="bg-[#0f1117] border-t border-[#2e3350] px-4 py-3 space-y-2">
                      {coach.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Mail className="w-3.5 h-3.5" />
                          {coach.email}
                        </div>
                      )}
                      {coach.date_of_birth && (
                        <p className="text-xs text-slate-400">DOB: {coach.date_of_birth}</p>
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
