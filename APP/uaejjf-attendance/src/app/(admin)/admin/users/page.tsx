import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import UserManagement from '@/components/admin/UserManagement'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const [coachesRes, supervisorsRes, scaRes, ccaRes] = await Promise.all([
    supabase.from('coaches').select('ps_number, name, email, date_of_birth, gender, active, project, sheet_supervisor').order('name'),
    supabase.from('supervisors').select('id, name, email, whatsapp').order('name'),
    supabase.from('supervisor_coach_assignments')
      .select('coach_ps_number, supervisor_id')
      .is('end_date', null),
    supabase.from('coach_class_assignments')
      .select('coach_ps_number, start_date, classes(clubs(name))')
      .is('end_date', null),
  ])

  const supervisorMap = Object.fromEntries((supervisorsRes.data ?? []).map(s => [s.id, s.name]))
  const coachSupervisorMap: Record<string, string> = {}
  for (const sca of scaRes.data ?? []) {
    coachSupervisorMap[sca.coach_ps_number] = supervisorMap[sca.supervisor_id] ?? ''
  }

  const coachClubsMap: Record<string, { name: string; since: string }[]> = {}
  for (const row of ccaRes.data ?? []) {
    const clubName = (row.classes as any)?.clubs?.name as string | undefined
    if (!clubName) continue
    if (!coachClubsMap[row.coach_ps_number]) coachClubsMap[row.coach_ps_number] = []
    const existing = coachClubsMap[row.coach_ps_number].find(c => c.name === clubName)
    if (!existing) {
      coachClubsMap[row.coach_ps_number].push({ name: clubName, since: row.start_date })
    } else if (row.start_date < existing.since) {
      existing.since = row.start_date
    }
  }

  const coaches = (coachesRes.data ?? []).map(c => ({
    ...c,
    assignment_supervisor: coachSupervisorMap[c.ps_number] ?? null,
    clubs: coachClubsMap[c.ps_number] ?? [],
  }))

  return (
    <AppShell role="admin" userName={profile?.name ?? 'Admin'}>
      <UserManagement coaches={coaches} supervisors={supervisorsRes.data ?? []} />
    </AppShell>
  )
}
