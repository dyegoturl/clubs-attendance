import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import ReportsPanel from '@/components/admin/ReportsPanel'

export default async function AdminReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const admin = await createAdminClient()
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).toISOString().split('T')[0]

  // Fetch all records with join data for report generation
  const { data: records } = await admin
    .from('attendance_records')
    .select(`
      id, coach_ps_number, class_id, date, status, student_count, is_late_report,
      coaches!inner(name),
      classes!inner(duration_minutes, club_id, program_id, class_type, class_identifier,
        clubs!inner(name, region_id, regions(name)),
        programs!inner(name)
      )
    `)
    .gte('date', firstDay)
    .lte('date', lastDay)

  // Fetch class rates
  const { data: rates } = await admin
    .from('class_rates')
    .select('class_id, program_id, rate_per_hour, effective_from, effective_to')

  return (
    <AppShell role="admin" userName={profile?.name ?? 'Admin'}>
      <ReportsPanel
        year={year}
        month={month}
        records={records ?? []}
        rates={rates ?? []}
      />
    </AppShell>
  )
}
