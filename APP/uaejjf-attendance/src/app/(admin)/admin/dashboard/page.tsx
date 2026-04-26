import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import AdminDashboard from '@/components/admin/AdminDashboard'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const now = new Date()
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [coachCount, supervisorCount, clubCount, monthRecords, lateCount, pendingEditCount] = await Promise.all([
    supabase.from('coaches').select('ps_number', { count: 'exact', head: true }),
    supabase.from('supervisors').select('id', { count: 'exact', head: true }),
    supabase.from('clubs').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('attendance_records')
      .select('status, is_late_report', { count: 'exact' })
      .gte('date', firstDay),
    supabase.from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .gte('date', firstDay).eq('is_late_report', true),
    supabase.from('attendance_edit_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  const records = monthRecords.data ?? []
  const presentCount = records.filter(r => r.status === 'P').length

  const stats = {
    coaches: coachCount.count ?? 0,
    supervisors: supervisorCount.count ?? 0,
    clubs: clubCount.count ?? 0,
    monthPresent: presentCount,
    monthLate: lateCount.count ?? 0,
    pendingEdits: pendingEditCount.count ?? 0,
  }

  return (
    <AppShell role="admin" userName={profile?.name ?? 'Admin'}>
      <AdminDashboard stats={stats} />
    </AppShell>
  )
}
