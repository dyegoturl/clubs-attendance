'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, CalendarCheck, History, Bell, Users, Settings, SlidersHorizontal,
  LogOut, ClipboardList, BarChart3, Shield, ChevronLeft, ChevronRight, Menu, X, FileDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const navByRole: Record<UserRole, NavItem[]> = {
  coach: [
    { href: '/coach/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/coach/attendance', label: 'Attendance', icon: CalendarCheck },
    { href: '/coach/history', label: 'My History', icon: History },
    { href: '/coach/sign-in-sheet', label: 'Sign-In Sheet', icon: FileDown },
  ],
  supervisor: [
    { href: '/supervisor/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/supervisor/coaches', label: 'Coaches', icon: Users },
    { href: '/supervisor/alerts', label: 'Alerts', icon: Bell },
    { href: '/supervisor/assignments', label: 'Assignments', icon: ClipboardList },
  ],
  admin: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/clubs', label: 'Clubs & Classes', icon: ClipboardList },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { href: '/admin/rates', label: 'Class Rates', icon: Settings },
    { href: '/admin/audit', label: 'Audit Log', icon: Shield },
    { href: '/admin/settings', label: 'Settings', icon: SlidersHorizontal },
  ],
}

interface Props {
  children: React.ReactNode
  role: UserRole
  userName: string
  alertCount?: number
}

export default function AppShell({ children, role, userName, alertCount = 0 }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = navByRole[role]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const roleLabel = { admin: 'Administrator', supervisor: 'Supervisor', coach: 'Coach' }[role]
  const roleColor = { admin: 'text-purple-400', supervisor: 'text-blue-400', coach: 'text-green-400' }[role]

  const Sidebar = () => (
    <aside className={cn(
      'flex flex-col bg-[#1a1d27] border-r border-[#2e3350] h-full transition-all duration-200',
      collapsed ? 'w-16' : 'w-56'
    )}>
      {/* Brand */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-[#2e3350]', collapsed && 'justify-center px-2')}>
        <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <CalendarCheck className="w-4 h-4 text-blue-400" />
        </div>
        {!collapsed && <span className="font-semibold text-sm text-white leading-tight">UAEJJF<br/><span className="text-xs text-slate-400 font-normal">Attendance</span></span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5',
                collapsed && 'justify-center px-2'
              )}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && label}
              {!collapsed && label === 'Alerts' && alertCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className={cn('border-t border-[#2e3350] p-3', collapsed && 'px-2')}>
        {!collapsed && (
          <div className="mb-2 px-2">
            <p className="text-xs font-medium text-white truncate">{userName}</p>
            <p className={cn('text-xs', roleColor)}>{roleLabel}</p>
          </div>
        )}
        <button onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all',
            collapsed && 'justify-center px-2'
          )}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>

      {/* Collapse toggle (desktop) */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="hidden md:flex absolute bottom-20 -right-3 w-6 h-6 rounded-full bg-[#2e3350] border border-[#3a4060] items-center justify-center text-slate-400 hover:text-white"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden relative">
      {/* Desktop sidebar */}
      <div className="hidden md:flex relative">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 w-56 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#1a1d27] border-b border-[#2e3350]">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm text-white">UAEJJF Attendance</span>
          {alertCount > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {alertCount}
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
