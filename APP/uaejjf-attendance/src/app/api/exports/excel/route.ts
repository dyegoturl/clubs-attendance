import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') ?? new Date().getFullYear())
  const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1)

  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).toISOString().split('T')[0]

  const admin = await createAdminClient()

  const { data: records } = await admin
    .from('attendance_records')
    .select(`
      coach_ps_number, date, status, student_count, notes, is_late_report, is_adhoc, submitted_at,
      coaches!inner(name),
      classes!inner(class_type, class_identifier, time_start, time_end, duration_minutes, program_id,
        clubs!inner(name, regions(name)),
        programs!inner(name)
      )
    `)
    .gte('date', firstDay)
    .lte('date', lastDay)
    .order('date')
    .order('coach_ps_number')

  const rows = (records ?? []).map((r: any) => ({
    'Date': r.date,
    'PS Number': r.coach_ps_number,
    'Coach Name': r.coaches?.name ?? '',
    'Club': r.classes?.clubs?.name ?? '',
    'Region': r.classes?.clubs?.regions?.name ?? '',
    'Program': r.classes?.programs?.name ?? '',
    'Class': r.classes?.class_identifier ?? r.classes?.class_type ?? '',
    'Time': r.classes?.time_start && r.classes?.time_end
      ? `${r.classes.time_start.slice(0, 5)} - ${r.classes.time_end.slice(0, 5)}`
      : '',
    'Duration (min)': r.classes?.duration_minutes ?? '',
    'Status': r.status,
    'Students': r.student_count ?? '',
    'Notes': r.notes ?? '',
    'Late Report': r.is_late_report ? 'Yes' : 'No',
    'Ad-hoc': r.is_adhoc ? 'Yes' : 'No',
    'Submitted At': r.submitted_at ? new Date(r.submitted_at).toLocaleString('en-AE') : '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, `${MONTHS[month - 1]} ${year}`)

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="UAEJJF_Attendance_${MONTHS[month - 1]}_${year}.xlsx"`,
    },
  })
}
