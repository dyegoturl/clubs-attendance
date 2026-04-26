import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import UserManagement from '@/components/admin/UserManagement'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const [coachesRes, supervisorsRes, scaRes] = await Promise.all([
    supabase.from('coaches').select('ps_number, name, email, date_of_birth, gender').order('name'),
    supabase.from('supervisors').select('id, name, email, whatsapp').order('name'),
    supabase.from('supervisor_coach_assignments')
      .select('coach_ps_number, supervisor_id')
      .is('end_date', null),
  ])

  const supervisorMap = Object.fromEntries((supervisorsRes.data ?? []).map(s => [s.id, s.name]))
  const coachSupervisorMap: Record<string, string> = {}
  for (const sca of scaRes.data ?? []) {
    coachSupervisorMap[sca.coach_ps_number] = supervisorMap[sca.supervisor_id] ?? ''
  }

  const coaches = (coachesRes.data ?? []).map(c => ({
    ...c,
    supervisor_name: coachSupervisorMap[c.ps_number] ?? null,
  }))

  return (
    <AppShell role="admin" userName={profile?.name ?? 'Admin'}>
      <UserManagement coaches={coaches} supervisors={supervisorsRes.data ?? []} />
    </AppShell>
  )
}
