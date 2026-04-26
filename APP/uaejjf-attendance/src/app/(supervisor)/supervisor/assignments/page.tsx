import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import AssignmentsManager from '@/components/supervisor/AssignmentsManager'

export const dynamic = 'force-dynamic'

export default async function AssignmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'supervisor') redirect('/login')

  const { data: supervisor } = await supabase
    .from('supervisors').select('id, name').eq('user_id', user.id).single()
  if (!supervisor) redirect('/login')

  // Get all coaches under this supervisor
  const { data: sca } = await supabase
    .from('supervisor_coach_assignments')
    .select('coach_ps_number')
    .eq('supervisor_id', supervisor.id)
    .is('end_date', null)

  const psNumbers = sca?.map(a => a.coach_ps_number) ?? []

  const [coachesRes, allAssignmentsRes, pendingRequestsRes, alertsRes] = await Promise.all([
    psNumbers.length
      ? supabase.from('coaches').select('ps_number, name').in('ps_number', psNumbers)
      : Promise.resolve({ data: [] }),
    psNumbers.length
      ? supabase.from('active_coach_assignments')
          .select('class_id, coach_ps_number, club_name, class_type, class_identifier, time_start, time_end, program_name, region_name')
          .in('coach_ps_number', psNumbers)
      : Promise.resolve({ data: [] }),
    supabase.from('attendance_edit_requests')
      .select('id, class_id, coach_ps_number, requested_date, requested_status, requested_notes, status, created_at')
      .in('coach_ps_number', psNumbers.length ? psNumbers : [''])
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase.from('alerts').select('id').eq('supervisor_id', supervisor.id).eq('is_read', false),
  ])

  // Get class details for edit requests
  const classIds = Array.from(new Set((pendingRequestsRes.data ?? []).map(r => r.class_id)))
  const { data: classDetails } = classIds.length
    ? await supabase.from('active_coach_assignments')
        .select('class_id, club_name, class_type, class_identifier, time_start, time_end')
        .in('class_id', classIds)
    : { data: [] }

  return (
    <AppShell role="supervisor" userName={supervisor.name} alertCount={alertsRes.data?.length ?? 0}>
      <AssignmentsManager
        supervisorId={supervisor.id}
        coaches={coachesRes.data ?? []}
        assignments={allAssignmentsRes.data ?? []}
        pendingEditRequests={(pendingRequestsRes.data ?? []).map(r => ({
          ...r,
          class_info: (classDetails ?? []).find(c => c.class_id === r.class_id) ?? null,
        }))}
      />
    </AppShell>
  )
}
