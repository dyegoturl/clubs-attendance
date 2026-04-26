'use client'

import Link from 'next/link'
import { Bell, Users, UserCheck, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CoachStatus {
  ps_number: string
  name: string
  email: string | null
  today_statuses: string[]
}

interface Props {
  supervisorName: string
  coaches: CoachStatus[]
  unreadAlerts: number
}

function getCoachBadge(statuses: string[]) {
  if (statuses.length === 0) return { label: 'Pending', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', icon: Clock }
  if (statuses.every(s => s === 'P')) return { label: 'Present', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: CheckCircle2 }
  if (statuses.some(s => s === 'P')) return { label: 'Partial', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: UserCheck }
  return { label: 'Absent', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: XCircle }
}

export default function SupervisorDashboard({ supervisorName, coaches, unreadAlerts }: Props) {
  const today = new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' })

  const present = coaches.filter(c => c.today_statuses.length > 0 && c.today_statuses.every(s => s === 'P')).length
  const absent = coaches.filter(c => c.today_statuses.length === 0 || c.today_statuses.some(s => s !== 'P')).length
  const pending = coaches.filter(c => c.today_statuses.length === 0).length

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Alert banner */}
      {unreadAlerts > 0 && (
        <Link href="/supervisor/alerts"
          className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 hover:bg-red-500/15 transition-colors">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">
              {unreadAlerts} unread {unreadAlerts === 1 ? 'alert' : 'alerts'}
            </p>
            <p className="text-xs text-red-400/80">Coaches with consecutive missed days</p>
          </div>
          <span className="ml-auto text-red-400 text-xs">View →</span>
        </Link>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Welcome, {supervisorName.split(' ')[0]}</h1>
        <p className="text-sm text-slate-400 mt-0.5">{today}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Coaches', value: coaches.length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Users },
          { label: 'Present Today', value: present, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: CheckCircle2 },
          { label: 'Pending Today', value: pending, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: Clock },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className={cn('rounded-xl border p-4 text-center', bg)}>
            <Icon className={cn('w-5 h-5 mx-auto mb-1', color)} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Coaches grid */}
      <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e3350]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Coach Status — Today</h2>
          </div>
          <Link href="/supervisor/coaches" className="text-xs text-blue-400 hover:text-blue-300">
            View all →
          </Link>
        </div>

        {coaches.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-500">No coaches assigned yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#2e3350]">
            {coaches.map(coach => {
              const badge = getCoachBadge(coach.today_statuses)
              const BadgeIcon = badge.icon
              return (
                <li key={coach.ps_number}>
                  <Link href={`/supervisor/coaches/${coach.ps_number}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#22263a] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{coach.name}</p>
                      <p className="text-xs text-slate-400">PS {coach.ps_number}</p>
                    </div>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                      badge.bg, badge.color
                    )}>
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/supervisor/alerts"
          className="flex items-center gap-3 bg-[#1a1d27] border border-[#2e3350] rounded-xl p-4 hover:bg-[#22263a] transition-colors">
          <Bell className={cn('w-5 h-5', unreadAlerts > 0 ? 'text-red-400' : 'text-slate-400')} />
          <div>
            <p className="text-sm font-semibold text-white">Alerts</p>
            <p className="text-xs text-slate-400">{unreadAlerts > 0 ? `${unreadAlerts} unread` : 'All clear'}</p>
          </div>
        </Link>
        <Link href="/supervisor/assignments"
          className="flex items-center gap-3 bg-[#1a1d27] border border-[#2e3350] rounded-xl p-4 hover:bg-[#22263a] transition-colors">
          <UserCheck className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-sm font-semibold text-white">Assignments</p>
            <p className="text-xs text-slate-400">Manage coach classes</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
