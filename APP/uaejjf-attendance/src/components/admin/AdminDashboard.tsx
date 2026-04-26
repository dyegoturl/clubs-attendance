'use client'

import Link from 'next/link'
import { Users, Building2, UserCheck, Clock, FileEdit, BarChart3, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Stats {
  coaches: number
  supervisors: number
  clubs: number
  monthPresent: number
  monthLate: number
  pendingEdits: number
}

interface Props { stats: Stats }

export default function AdminDashboard({ stats }: Props) {
  const today = new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">{today}</p>
      </div>

      {/* System overview */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Coaches', value: stats.coaches, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', href: '/admin/users' },
          { label: 'Supervisors', value: stats.supervisors, icon: UserCheck, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', href: '/admin/users' },
          { label: 'Active Clubs', value: stats.clubs, icon: Building2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', href: '/admin/clubs' },
        ].map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className={cn('rounded-xl border p-4 text-center hover:opacity-80 transition-opacity', bg)}>
            <Icon className={cn('w-5 h-5 mx-auto mb-1', color)} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </Link>
        ))}
      </div>

      {/* This month */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Present This Month', value: stats.monthPresent, icon: BarChart3, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Late Reports', value: stats.monthLate, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
          { label: 'Pending Edits', value: stats.pendingEdits, icon: FileEdit, color: stats.pendingEdits > 0 ? 'text-red-400' : 'text-slate-400', bg: stats.pendingEdits > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#1a1d27] border-[#2e3350]' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={cn('rounded-xl border p-4 text-center', bg)}>
            <Icon className={cn('w-5 h-5 mx-auto mb-1', color)} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'User Management', desc: 'Coaches & supervisors', href: '/admin/users', icon: Users },
          { label: 'Clubs & Classes', desc: 'Manage schedule', href: '/admin/clubs', icon: Building2 },
          { label: 'Class Rates', desc: 'Private rate config', href: '/admin/rates', icon: DollarSign },
          { label: 'Reports & Export', desc: 'Monthly reports', href: '/admin/reports', icon: BarChart3 },
          { label: 'Audit Log', desc: 'System activity', href: '/admin/audit', icon: FileEdit },
        ].map(({ label, desc, href, icon: Icon }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 bg-[#1a1d27] border border-[#2e3350] rounded-xl p-4 hover:bg-[#22263a] transition-colors">
            <Icon className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-slate-400">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
