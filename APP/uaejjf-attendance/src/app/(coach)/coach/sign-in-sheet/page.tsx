import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import SignInSheetDownloader from '@/components/coach/SignInSheetDownloader'

export const dynamic = 'force-dynamic'

export default async function SignInSheetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, coachRes] = await Promise.all([
    supabase.from('profiles').select('role, name').eq('id', user.id).single(),
    supabase.from('coaches').select('ps_number, name').eq('user_id', user.id).single(),
  ])
  if (profileRes.data?.role !== 'coach') redirect('/login')
  if (!coachRes.data) redirect('/login')

  const { data: assignments } = await supabase
    .from('active_coach_assignments')
    .select('class_id, club_name, class_identifier, class_type, time_start, time_end')
    .eq('coach_ps_number', coachRes.data.ps_number)

  return (
    <AppShell role="coach" userName={coachRes.data.name}>
      <SignInSheetDownloader psNumber={coachRes.data.ps_number} assignments={assignments ?? []} />
    </AppShell>
  )
}
