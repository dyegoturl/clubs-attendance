import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import CoachDashboard from '@/components/coach/CoachDashboard'

export const dynamic = 'force-dynamic'

export default async function CoachDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, coachRes] = await Promise.all([
    supabase.from('profiles').select('role, name').eq('id', user.id).single(),
    supabase.from('coaches').select('ps_number, name').eq('user_id', user.id).single(),
  ])

  if (profileRes.data?.role !== 'coach') redirect('/login')
  if (!coachRes.data) redirect('/login')

  const psNumber = coachRes.data.ps_number

  // Get today's schedule with attendance status
  const { data: todayClasses } = await supabase
    .from('daily_attendance_status')
    .select('*')
    .eq('coach_ps_number', psNumber)

  // Get weekly assignments for the calendar
  const { data: weekAssignments } = await supabase
    .from('active_coach_assignments')
    .select('class_id, class_identifier, class_type, gender, time_start, time_end, days_of_week, club_name')
    .eq('coach_ps_number', psNumber)

  // Get pending days (unresolved attendance in the past)
  const { data: pendingDays } = await supabase
    .from('attendance_records')
    .select('date, class_id, status')
    .eq('coach_ps_number', psNumber)
    .lt('date', new Date().toISOString().split('T')[0])
    .is('status', null)
    .order('date', { ascending: true })
    .limit(10)

  // Get this month's summary
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const { data: monthRecords } = await supabase
    .from('attendance_records')
    .select('status, is_late_report')
    .eq('coach_ps_number', psNumber)
    .gte('date', monthStart)

  const present = monthRecords?.filter(r => r.status === 'P').length ?? 0
  const cancelled = monthRecords?.filter(r => r.status === 'C').length ?? 0
  const lateReports = monthRecords?.filter(r => r.is_late_report).length ?? 0

  return (
    <AppShell role="coach" userName={coachRes.data.name}>
      <CoachDashboard
        psNumber={psNumber}
        coachName={coachRes.data.name}
        todayClasses={todayClasses ?? []}
        pendingCount={pendingDays?.length ?? 0}
        monthStats={{ present, cancelled, lateReports }}
        weekSlots={weekAssignments?.map(a => ({ ...a, id: a.class_id })) ?? []}
      />
    </AppShell>
  )
}
