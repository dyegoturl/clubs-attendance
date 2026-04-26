import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import SupervisorCoachesList from '@/components/supervisor/SupervisorCoachesList'

export default async function SupervisorCoachesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'supervisor') redirect('/login')

  const { data: supervisor } = await supabase
    .from('supervisors').select('id, name').eq('user_id', user.id).single()
  if (!supervisor) redirect('/login')

  const { data: sca } = await supabase
    .from('supervisor_coach_assignments')
    .select('coach_ps_number')
    .eq('supervisor_id', supervisor.id)
    .is('end_date', null)

  const psNumbers = sca?.map(a => a.coach_ps_number) ?? []

  const [coachesRes, alertsRes] = await Promise.all([
    psNumbers.length
      ? supabase.from('coaches').select('ps_number, name, email, date_of_birth').in('ps_number', psNumbers)
      : Promise.resolve({ data: [] }),
    supabase.from('alerts').select('id').eq('supervisor_id', supervisor.id).eq('is_read', false),
  ])

  // Month stats per coach
  const now = new Date()
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data: monthRecords } = psNumbers.length
    ? await supabase.from('attendance_records')
        .select('coach_ps_number, status, is_late_report')
        .in('coach_ps_number', psNumbers)
        .gte('date', firstDay)
    : { data: [] }

  const statsByCoach: Record<string, { present: number; late: number; absent: number }> = {}
  for (const r of monthRecords ?? []) {
    if (!statsByCoach[r.coach_ps_number]) statsByCoach[r.coach_ps_number] = { present: 0, late: 0, absent: 0 }
    if (r.status === 'P') statsByCoach[r.coach_ps_number].present++
    if (r.is_late_report) statsByCoach[r.coach_ps_number].late++
    if (r.status !== 'P' && r.status !== 'C') statsByCoach[r.coach_ps_number].absent++
  }

  const coaches = (coachesRes.data ?? []).map(c => ({
    ...c,
    stats: statsByCoach[c.ps_number] ?? { present: 0, late: 0, absent: 0 },
  }))

  return (
    <AppShell role="supervisor" userName={supervisor.name} alertCount={alertsRes.data?.length ?? 0}>
      <SupervisorCoachesList coaches={coaches} />
    </AppShell>
  )
}
