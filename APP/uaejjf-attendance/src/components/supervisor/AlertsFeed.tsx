'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Bell, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface Alert {
  id: string
  type: string
  coach_ps_number: string | null
  coach_name: string
  data: unknown
  is_read: boolean
  created_at: string
}

interface Props {
  alerts: Alert[]
  supervisorId: string
}

export default function AlertsFeed({ alerts: initialAlerts, supervisorId }: Props) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [markingAll, setMarkingAll] = useState(false)

  const unread = alerts.filter(a => !a.is_read).length

  async function markRead(id: string) {
    const res = await fetch('/api/supervisor/mark-alert-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_id: id }),
    })
    if (res.ok) {
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
    }
  }

  async function markAllRead() {
    setMarkingAll(true)
    try {
      const res = await fetch('/api/supervisor/mark-alert-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supervisor_id: supervisorId, mark_all: true }),
      })
      if (res.ok) {
        setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
        toast.success('All alerts marked as read')
      }
    } catch { toast.error('Failed to update') }
    finally { setMarkingAll(false) }
  }

  function getDates(alert: Alert): string[] {
    if (!alert.data) return []
    const d = alert.data as { dates?: string[] }
    return d.dates ?? []
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Alerts</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {unread > 0 ? `${unread} unread` : 'All caught up'}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} disabled={markingAll}
            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2e3350]">
          <Bell className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Recent Alerts</h2>
        </div>

        {alerts.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500/50 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No alerts — all coaches are on track</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#2e3350]">
            {alerts.map(alert => {
              const dates = getDates(alert)
              return (
                <li key={alert.id} className={cn(
                  'px-4 py-4 transition-colors',
                  !alert.is_read ? 'bg-red-500/5' : ''
                )}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', !alert.is_read ? 'text-red-400' : 'text-slate-600')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/supervisor/coaches/${alert.coach_ps_number}`}
                          className="text-sm font-semibold text-white hover:text-blue-300 transition-colors">
                          {alert.coach_name}
                        </Link>
                        {!alert.is_read && (
                          <span className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {alert.type === 'consecutive_miss'
                          ? `Missed attendance on ${dates.map(formatDate).join(', ')}`
                          : alert.type}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {new Date(alert.created_at).toLocaleDateString('en-AE', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {!alert.is_read && (
                      <button onClick={() => markRead(alert.id)}
                        className="text-xs text-slate-400 hover:text-white border border-[#2e3350] hover:border-slate-500 px-2 py-1 rounded transition-colors flex-shrink-0">
                        Dismiss
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
