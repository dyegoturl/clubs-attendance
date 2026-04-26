import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import SupervisorDashboard from '@/components/supervisor/SupervisorDashboard'

export const dynamic = 'force-dynamic'

export default async function SupervisorDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'supervisor') redirect('/login')

  const { data: supervisor } = await supabase
    .from('supervisors')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!supervisor) redirect('/login')

  // All coaches under this supervisor
  const { data: assignments } = await supabase
    .from('supervisor_coach_assignments')
    .select('coach_ps_number')
    .eq('supervisor_id', supervisor.id)
    .is('end_date', null)

  const psNumbers = assignments?.map(a => a.coach_ps_number) ?? []

  // Fetch coach details + today's attendance in parallel
  const today = new Date().toISOString().split('T')[0]

  const [coachesRes, todayAttendanceRes, alertsRes] = await Promise.all([
    psNumbers.length
      ? supabase.from('coaches').select('ps_number, name, email').in('ps_number', psNumbers)
      : Promise.resolve({ data: [] }),
    psNumbers.length
      ? supabase.from('attendance_records').select('coach_ps_number, status, class_id')
          .in('coach_ps_number', psNumbers).eq('date', today)
      : Promise.resolve({ data: [] }),
    supabase.from('alerts').select('id').eq('supervisor_id', supervisor.id).eq('is_read', false),
  ])

  // Build per-coach status summary
  const todayByCoach: Record<string, string[]> = {}
  for (const r of todayAttendanceRes.data ?? []) {
    if (!todayByCoach[r.coach_ps_number]) todayByCoach[r.coach_ps_number] = []
    todayByCoach[r.coach_ps_number].push(r.status)
  }

  const coaches = (coachesRes.data ?? []).map(c => ({
    ps_number: c.ps_number,
    name: c.name,
    email: c.email,
    today_statuses: todayByCoach[c.ps_number] ?? [],
  }))

  return (
    <AppShell role="supervisor" userName={supervisor.name} alertCount={alertsRes.data?.length ?? 0}>
      <SupervisorDashboard
        supervisorName={supervisor.name}
        coaches={coaches}
        unreadAlerts={alertsRes.data?.length ?? 0}
      />
    </AppShell>
  )
}
