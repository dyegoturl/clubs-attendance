'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, UserCheck } from 'lucide-react'
import { cn, formatDate, formatTimeRange } from '@/lib/utils'
import { ATTENDANCE_CODES } from '@/lib/constants'
import type { AttendanceStatus } from '@/types'

interface Coach { ps_number: string; name: string }

interface Assignment {
  class_id: string
  coach_ps_number: string
  club_name: string
  class_type: string
  class_identifier: string | null
  time_start: string | null
  time_end: string | null
  program_name: string
  region_name: string | null
}

interface ClassInfo {
  class_id: string
  club_name: string
  class_type: string
  class_identifier: string | null
  time_start: string | null
  time_end: string | null
}

interface EditRequest {
  id: string
  class_id: string
  coach_ps_number: string
  requested_date: string
  requested_status: string
  requested_notes: string | null
  status: string
  created_at: string
  class_info: ClassInfo | null
}

interface Props {
  supervisorId: string
  coaches: Coach[]
  assignments: Assignment[]
  pendingEditRequests: EditRequest[]
}

export default function AssignmentsManager({ supervisorId, coaches, assignments, pendingEditRequests }: Props) {
  const [editRequests, setEditRequests] = useState(pendingEditRequests)
  const [expandedCoach, setExpandedCoach] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const coachMap = Object.fromEntries(coaches.map(c => [c.ps_number, c.name]))

  const assignmentsByCoach: Record<string, Assignment[]> = {}
  for (const a of assignments) {
    if (!assignmentsByCoach[a.coach_ps_number]) assignmentsByCoach[a.coach_ps_number] = []
    assignmentsByCoach[a.coach_ps_number].push(a)
  }

  async function resolveEditRequest(requestId: string, approve: boolean) {
    setProcessing(requestId)
    try {
      const res = await fetch('/api/supervisor/resolve-edit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, approve, supervisor_id: supervisorId }),
      })
      if (!res.ok) { toast.error('Failed to process request'); return }
      toast.success(approve ? 'Edit approved and applied' : 'Edit request rejected')
      setEditRequests(prev => prev.filter(r => r.id !== requestId))
    } catch { toast.error('Network error') }
    finally { setProcessing(null) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Assignments</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage coach class assignments and approve edit requests</p>
      </div>

      {/* Pending edit requests */}
      {editRequests.length > 0 && (
        <div className="bg-[#1a1d27] rounded-xl border border-orange-500/30 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-orange-500/20 bg-orange-500/5">
            <Clock className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-orange-300">
              Pending Edit Requests ({editRequests.length})
            </h2>
          </div>
          <ul className="divide-y divide-[#2e3350]">
            {editRequests.map(req => {
              const statusInfo = ATTENDANCE_CODES[req.requested_status as AttendanceStatus]
              const cls = req.class_info
              return (
                <li key={req.id} className="px-4 py-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{coachMap[req.coach_ps_number] ?? req.coach_ps_number}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDate(req.requested_date)}
                          {cls ? ` · ${cls.club_name} · ${cls.class_identifier ?? cls.class_type}` : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">Requesting:</span>
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border',
                            statusInfo?.bg, statusInfo?.text, statusInfo?.border
                          )}>
                            {statusInfo?.label ?? req.requested_status}
                          </span>
                        </div>
                        {req.requested_notes && (
                          <p className="text-xs text-slate-500 mt-1 italic">"{req.requested_notes}"</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveEditRequest(req.id, true)}
                        disabled={processing === req.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => resolveEditRequest(req.id, false)}
                        disabled={processing === req.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50">
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Coach assignments accordion */}
      <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2e3350]">
          <UserCheck className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Current Assignments</h2>
        </div>

        {coaches.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-500">No coaches assigned</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#2e3350]">
            {coaches.map(coach => {
              const coachAssignments = assignmentsByCoach[coach.ps_number] ?? []
              const isOpen = expandedCoach === coach.ps_number
              return (
                <li key={coach.ps_number}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#22263a] transition-colors"
                    onClick={() => setExpandedCoach(isOpen ? null : coach.ps_number)}
                  >
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-white">{coach.name}</p>
                      <p className="text-xs text-slate-400">{coachAssignments.length} active class{coachAssignments.length !== 1 ? 'es' : ''}</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>

                  {isOpen && (
                    <div className="bg-[#0f1117] border-t border-[#2e3350]">
                      {coachAssignments.length === 0 ? (
                        <p className="px-6 py-4 text-xs text-slate-500">No active assignments</p>
                      ) : (
                        <ul className="divide-y divide-[#1a1d27]">
                          {coachAssignments.map(a => (
                            <li key={a.class_id} className="px-6 py-3">
                              <p className="text-sm text-white">{a.club_name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {a.class_identifier ?? a.class_type}
                                {a.time_start && a.time_end ? ` · ${formatTimeRange(a.time_start, a.time_end)}` : ''}
                                {a.region_name ? ` · ${a.region_name}` : ''}
                              </p>
                              <span className="text-xs text-slate-500">{a.program_name}</span>
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
