import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import ClubsManager from '@/components/admin/ClubsManager'

export const dynamic = 'force-dynamic'

export default async function AdminClubsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const [clubsRes, classesRes, regionsRes, programsRes] = await Promise.all([
    supabase.from('clubs').select('id, name, region_id, is_active').order('name'),
    supabase.from('classes').select('id, club_id, class_type, class_identifier, gender, time_start, time_end, days_of_week, program_id, duration_minutes, is_active').order('club_id'),
    supabase.from('regions').select('id, name').order('name'),
    supabase.from('programs').select('id, name').order('name'),
  ])

  return (
    <AppShell role="admin" userName={profile?.name ?? 'Admin'}>
      <ClubsManager
        clubs={clubsRes.data ?? []}
        classes={classesRes.data ?? []}
        regions={regionsRes.data ?? []}
        programs={programsRes.data ?? []}
      />
    </AppShell>
  )
}
