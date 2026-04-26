import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import RatesManager from '@/components/admin/RatesManager'

export default async function AdminRatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  // Use admin client to bypass RLS — rates are admin-only
  const admin = await createAdminClient()

  const [ratesRes, classesRes, programsRes] = await Promise.all([
    admin.from('class_rates').select('id, class_id, program_id, rate_per_hour, effective_from, effective_to').order('effective_from', { ascending: false }),
    admin.from('classes').select('id, club_id, class_type, class_identifier, program_id'),
    admin.from('programs').select('id, name'),
  ])

  const [clubsRes] = await Promise.all([
    admin.from('clubs').select('id, name'),
  ])

  return (
    <AppShell role="admin" userName={profile?.name ?? 'Admin'}>
      <RatesManager
        rates={ratesRes.data ?? []}
        classes={classesRes.data ?? []}
        programs={programsRes.data ?? []}
        clubs={clubsRes.data ?? []}
      />
    </AppShell>
  )
}
