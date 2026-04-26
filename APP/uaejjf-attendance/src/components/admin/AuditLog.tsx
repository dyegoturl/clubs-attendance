'use client'

import { useState } from 'react'
import { FileEdit } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogEntry {
  id: string
  actor_id: string | null
  actor_name: string
  action: string
  target_type: string | null
  target_id: string | null
  metadata: unknown
  created_at: string
}

interface Props { logs: LogEntry[] }

const ACTION_COLORS: Record<string, string> = {
  supervisor_edit_attendance: 'text-blue-400',
  approve_edit_request: 'text-green-400',
  reject_edit_request: 'text-red-400',
  reset_password: 'text-orange-400',
  set_class_rate: 'text-yellow-400',
}

export default function AuditLog({ logs }: Props) {
  const [search, setSearch] = useState('')

  const filtered = logs.filter(l =>
    l.actor_name.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.target_id ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function formatAction(action: string) {
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Audit Log</h1>
        <p className="text-sm text-slate-400 mt-0.5">Last 100 system actions</p>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search actions, actors…"
        className="w-full bg-[#1a1d27] border border-[#2e3350] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
      />

      <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2e3350]">
          <FileEdit className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">{filtered.length} entries</h2>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No entries</p>
        ) : (
          <ul className="divide-y divide-[#2e3350]">
            {filtered.map(log => (
              <li key={log.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-xs font-semibold', ACTION_COLORS[log.action] ?? 'text-slate-300')}>
                        {formatAction(log.action)}
                      </span>
                      {log.target_id && (
                        <span className="text-xs text-slate-500 font-mono">{log.target_id.slice(0, 8)}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">by {log.actor_name}</p>
                  </div>
                  <p className="text-xs text-slate-600 flex-shrink-0">
                    {new Date(log.created_at).toLocaleDateString('en-AE', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
