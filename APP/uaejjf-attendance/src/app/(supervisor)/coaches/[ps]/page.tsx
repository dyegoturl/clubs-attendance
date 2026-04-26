import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import CoachDetailView from '@/components/supervisor/CoachDetailView'

export default async function CoachDetailPage({ params }: { params: { ps: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'supervisor') redirect('/login')

  const { data: supervisor } = await supabase
    .from('supervisors').select('id, name').eq('user_id', user.id).single()
  if (!supervisor) redirect('/login')

  // Verify this coach is under this supervisor
  const { data: sca } = await supabase
    .from('supervisor_coach_assignments')
    .select('coach_ps_number')
    .eq('supervisor_id', supervisor.id)
    .eq('coach_ps_number', params.ps)
    .is('end_date', null)
    .single()

  if (!sca) notFound()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).toISOString().split('T')[0]

  const [coachRes, recordsRes, assignmentsRes, alertsRes] = await Promise.all([
    supabase.from('coaches').select('ps_number, name, email').eq('ps_number', params.ps).single(),
    supabase.from('attendance_records')
      .select('id, class_id, date, status, student_count, notes, is_late_report, is_adhoc, submitted_at')
      .eq('coach_ps_number', params.ps)
      .gte('date', firstDay).lte('date', lastDay)
      .order('date', { ascending: false }),
    supabase.from('active_coach_assignments')
      .select('class_id, club_name, class_type, class_identifier, time_start, time_end, program_name')
      .eq('coach_ps_number', params.ps),
    supabase.from('alerts').select('id').eq('supervisor_id', supervisor.id).eq('is_read', false),
  ])

  if (!coachRes.data) notFound()

  return (
    <AppShell role="supervisor" userName={supervisor.name} alertCount={alertsRes.data?.length ?? 0}>
      <CoachDetailView
        coach={coachRes.data}
        records={recordsRes.data ?? []}
        assignments={assignmentsRes.data ?? []}
        year={year}
        month={month}
        supervisorId={supervisor.id}
      />
    </AppShell>
  )
}
