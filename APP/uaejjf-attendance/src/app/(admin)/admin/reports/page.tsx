import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import ReportsPanel from '@/components/admin/ReportsPanel'
import MonthlyOverview from '@/components/admin/MonthlyOverview'

export const dynamic = 'force-dynamic'

function calcExpectedSlots(daysOfWeek: string[], year: number, month: number): number {
  const DAY_MAP: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
  }
  const dayNumbers = (daysOfWeek ?? []).map(d => DAY_MAP[d]).filter(d => d !== undefined)
  if (dayNumbers.length === 0) return 0
  let count = 0
  const date = new Date(year, month - 1, 1)
  while (date.getMonth() === month - 1) {
    if (dayNumbers.includes(date.getDay())) count++
    date.setDate(date.getDate() + 1)
  }
  return count
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const now = new Date()
  const params = await searchParams
  const [year, month] = params.month
    ? params.month.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1]
  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const monthStart = `${monthStr}-01`
  const monthEnd = `${monthStr}-${new Date(year, month, 0).getDate()}`

  const admin = await createAdminClient()

  const [
    assignmentsRes, complianceRecordsRes, projetosRes, regionsRes,
    payrollRecordsRes, ratesRes,
  ] = await Promise.all([
    supabase.from('active_coach_assignments').select('class_id, club_name, class_identifier, class_type, gender, region_name, days_of_week, requires_student_count'),
    supabase.from('attendance_records').select('class_id, date, status, student_count').gte('date', monthStart).lte('date', monthEnd),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('projeto').select('name').order('name'),
    supabase.from('regions').select('name').order('name'),
    admin.from('attendance_records').select(`
      id, coach_ps_number, class_id, date, status, student_count, is_late_report,
      coaches!inner(name),
      classes!inner(duration_minutes, club_id, program_id, class_type, class_identifier,
        clubs!inner(name, region_id, regions(name)),
        programs!inner(name)
      )
    `).gte('date', monthStart).lte('date', monthEnd),
    admin.from('class_rates').select('class_id, program_id, rate_per_hour, effective_from, effective_to'),
  ])

  // Build compliance summaries
  const assignments = assignmentsRes.data ?? []
  const records = complianceRecordsRes.data ?? []

  const classMap = new Map<string, typeof assignments[0]>()
  for (const a of assignments) classMap.set(a.class_id, a)
  const classes = Array.from(classMap.values())

  const summaries = classes.map(cls => {
    const expected = calcExpectedSlots(cls.days_of_week ?? [], year, month)
    const clsRecords = records.filter(r => r.class_id === cls.class_id)
    const breakdown: Record<string, number> = { P: 0, N: 0, R: 0, C: 0, H: 0 }
    let total_students = 0
    for (const r of clsRecords) {
      if (r.status) breakdown[r.status] = (breakdown[r.status] ?? 0) + 1
      total_students += r.student_count ?? 0
    }
    return {
      class_id: cls.class_id,
      club_name: cls.club_name,
      class_identifier: cls.class_identifier,
      class_type: cls.class_type,
      gender: cls.gender,
      region_name: cls.region_name,
      projeto_name: null as string | null,
      expected,
      reported: clsRecords.length,
      breakdown,
      total_students,
    }
  })

  return (
    <AppShell role="admin" userName={profile?.name ?? 'Admin'}>
      <div className="space-y-12">
        <MonthlyOverview
          summaries={summaries}
          month={monthStr}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          projetos={(projetosRes as any).data?.map((p: any) => p.name) ?? []}
          regions={regionsRes.data?.map(r => r.name) ?? []}
        />
        <div className="border-t border-[#2e3350] pt-8">
          <ReportsPanel
            year={year}
            month={month}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            records={(payrollRecordsRes.data ?? []) as any[]}
            rates={ratesRes.data ?? []}
          />
        </div>
      </div>
    </AppShell>
  )
}
