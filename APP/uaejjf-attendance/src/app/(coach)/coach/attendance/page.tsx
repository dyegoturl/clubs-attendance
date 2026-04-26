import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import AttendanceForm from '@/components/coach/AttendanceForm'

export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, coachRes] = await Promise.all([
    supabase.from('profiles').select('role, name').eq('id', user.id).single(),
    supabase.from('coaches').select('ps_number, name').eq('user_id', user.id).single(),
  ])

  if (profileRes.data?.role !== 'coach') redirect('/login')
  const psNumber = coachRes.data?.ps_number
  if (!psNumber) redirect('/login')

  // All active assignments for this coach
  const { data: assignments } = await supabase
    .from('active_coach_assignments')
    .select('*')
    .eq('coach_ps_number', psNumber)

  return (
    <AppShell role="coach" userName={coachRes.data!.name}>
      <AttendanceForm
        psNumber={psNumber}
        assignments={assignments ?? []}
      />
    </AppShell>
  )
}
