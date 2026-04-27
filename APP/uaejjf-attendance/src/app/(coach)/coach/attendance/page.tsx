import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import AttendanceFlow from '@/components/coach/AttendanceFlow'
import AttendanceForm from '@/components/coach/AttendanceForm'

export const dynamic = 'force-dynamic'

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
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

  // Today's pending slots (no attendance record yet)
  const { data: todaySlots } = await supabase
    .from('daily_attendance_status')
    .select('*')
    .eq('coach_ps_number', psNumber)
    .is('attendance_id', null)

  // All assignments for fallback form
  const { data: assignments } = await supabase
    .from('active_coach_assignments')
    .select('*')
    .eq('coach_ps_number', psNumber)

  const params = await searchParams
  const useForm = params.mode === 'form'

  return (
    <AppShell role="coach" userName={coachRes.data!.name}>
      {useForm ? (
        <AttendanceForm psNumber={psNumber} assignments={assignments ?? []} />
      ) : (
        <AttendanceFlow psNumber={psNumber} pendingSlots={todaySlots ?? []} />
      )}
    </AppShell>
  )
}
