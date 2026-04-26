import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import CoachHistory from '@/components/coach/CoachHistory'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
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

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).toISOString().split('T')[0]

  const { data: records } = await supabase
    .from('attendance_records')
    .select('id, class_id, date, status, student_count, notes, is_late_report, is_adhoc, submitted_at')
    .eq('coach_ps_number', psNumber)
    .gte('date', firstDay)
    .lte('date', lastDay)
    .order('date', { ascending: false })

  const { data: assignments } = await supabase
    .from('active_coach_assignments')
    .select('class_id, club_name, class_type, class_identifier, time_start, time_end, program_name')
    .eq('coach_ps_number', psNumber)

  return (
    <AppShell role="coach" userName={coachRes.data!.name}>
      <CoachHistory
        psNumber={psNumber}
        records={records ?? []}
        assignments={assignments ?? []}
        year={year}
        month={month}
      />
    </AppShell>
  )
}
