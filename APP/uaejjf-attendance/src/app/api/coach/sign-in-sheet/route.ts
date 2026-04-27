import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('class_id')
  const month = searchParams.get('month')  // YYYY-MM
  const psNumber = searchParams.get('ps_number')

  if (!classId || !month || !psNumber) return new NextResponse('Missing params', { status: 400 })

  const [year, mon] = month.split('-').map(Number)
  const monthStart = `${month}-01`
  const monthEnd = `${month}-${new Date(year, mon, 0).getDate()}`

  const [assignRes, recordsRes, coachRes] = await Promise.all([
    supabase.from('active_coach_assignments').select('*').eq('class_id', classId).eq('coach_ps_number', psNumber).single(),
    supabase.from('attendance_records').select('date, status, student_count, notes')
      .eq('class_id', classId).eq('coach_ps_number', psNumber)
      .gte('date', monthStart).lte('date', monthEnd).order('date'),
    supabase.from('coaches').select('name').eq('ps_number', psNumber).single(),
  ])

  const a = assignRes.data
  const records = recordsRes.data ?? []
  const coachName = coachRes.data?.name ?? psNumber

  if (!a) return new NextResponse('Assignment not found', { status: 404 })

  const DAY_MAP: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
  }
  const dayNumbers = (a.days_of_week ?? []).map((d: string) => DAY_MAP[d]).filter((d: number | undefined) => d !== undefined)
  const classDays: string[] = []
  const date = new Date(year, mon - 1, 1)
  while (date.getMonth() === mon - 1) {
    if (dayNumbers.includes(date.getDay())) {
      classDays.push(date.toISOString().split('T')[0])
    }
    date.setDate(date.getDate() + 1)
  }

  const recordMap = Object.fromEntries(records.map(r => [r.date, r]))
  const STATUS_LABEL: Record<string, string> = {
    P: 'Present', N: 'Sick', R: 'Replaced', C: 'Class Canceled', H: 'Tournament',
  }

  const rows = classDays.map((d, i) => {
    const r = recordMap[d]
    const dateLabel = new Date(d + 'T12:00:00').toLocaleDateString('en-AE', { day: '2-digit', month: 'short', weekday: 'short' })
    const status = r ? (STATUS_LABEL[r.status] ?? r.status) : ''
    const students = r?.student_count ?? ''
    const hours = a.duration_minutes ? (a.duration_minutes / 60).toFixed(2) : ''
    const notes = r?.notes ?? ''
    return `<tr><td>${i + 1}</td><td>${dateLabel}</td><td>${status}</td><td>${students}</td><td>${hours}</td><td>${notes}</td></tr>`
  })

  const totalPresent = records.filter(r => r.status === 'P').length
  const totalHours = a.duration_minutes ? ((totalPresent * a.duration_minutes) / 60).toFixed(2) : '—'
  const timeLabel = [a.time_start, a.time_end].filter(Boolean).join(' – ') || '—'
  const monthLabel = new Date(year, mon - 1).toLocaleDateString('en-AE', { month: 'long', year: 'numeric' })

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Sign-In Sheet — ${coachName} — ${monthLabel}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #111; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f0f0f0; border: 1px solid #ccc; padding: 5px 8px; text-align: left; }
  td { border: 1px solid #ccc; padding: 4px 8px; }
  .footer { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .sig { border-top: 1px solid #000; margin-top: 40px; padding-top: 4px; }
  @media print { body { margin: 10mm; } }
</style>
</head><body>
<h1>Sign-In Sheet</h1>
<div class="meta">
  <div><b>Coach:</b> ${coachName}</div><div><b>PS Number:</b> ${psNumber}</div>
  <div><b>Club:</b> ${a.club_name}</div><div><b>Region:</b> ${a.region_name ?? '—'}</div>
  <div><b>Class:</b> ${a.class_identifier ?? a.class_type ?? '—'}</div><div><b>Time:</b> ${timeLabel}</div>
  <div><b>Month:</b> ${monthLabel}</div><div><b>Type:</b> ${a.class_type ?? '—'}</div>
</div>
<table>
  <thead><tr><th>#</th><th>Date</th><th>Status</th><th>Students</th><th>Hours</th><th>Notes</th></tr></thead>
  <tbody>${rows.join('')}</tbody>
</table>
<div class="footer">
  <div><b>Total Present:</b> ${totalPresent} / ${classDays.length}<br><b>Total Hours:</b> ${totalHours}</div>
  <div><div class="sig">Coach Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date</div></div>
</div>
</body></html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
