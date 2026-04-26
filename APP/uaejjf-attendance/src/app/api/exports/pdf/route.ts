import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
      coach_ps_number, date, status, student_count, notes, is_late_report,
      coaches!inner(name),
      classes!inner(class_type, class_identifier, time_start, time_end, duration_minutes,
        clubs!inner(name, regions(name)),
        programs!inner(name)
      )
    `)
    .gte('date', firstDay)
    .lte('date', lastDay)
    .order('date')

  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('UAEJJF Clubs — Monthly Attendance', pageW / 2, 16, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`${MONTHS[month - 1]} ${year}`, pageW / 2, 22, { align: 'center' })

  const rows = (records ?? []).map((r: any) => [
    r.date,
    r.coaches?.name ?? '',
    r.coach_ps_number,
    r.classes?.clubs?.name ?? '',
    r.classes?.clubs?.regions?.name ?? '',
    r.classes?.programs?.name ?? '',
    r.classes?.class_identifier ?? r.classes?.class_type ?? '',
    r.classes?.time_start ? r.classes.time_start.slice(0, 5) : '',
    r.status,
    r.student_count ?? '',
    r.is_late_report ? '⚠' : '',
  ])

  autoTable(doc, {
    startY: 28,
    head: [['Date', 'Coach', 'PS No.', 'Club', 'Region', 'Program', 'Class', 'Time', 'Status', 'Students', 'Late']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 10, right: 10 },
  })

  const pdfBytes = doc.output('arraybuffer')

  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="UAEJJF_Attendance_${MONTHS[month - 1]}_${year}.pdf"`,
    },
  })
}
