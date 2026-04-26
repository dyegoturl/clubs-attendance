import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

interface RateRow {
  class_id: string | null
  program_id: string | null
  rate_per_hour: number
  effective_from: string
  effective_to: string | null
}

function getRate(rates: RateRow[], classId: string, programId: string, date: string): number {
  // Priority: specific class > program > default
  const classRate = rates.find(r =>
    r.class_id === classId &&
    r.effective_from <= date &&
    (!r.effective_to || r.effective_to > date)
  )
  if (classRate) return classRate.rate_per_hour

  const programRate = rates.find(r =>
    !r.class_id && r.program_id === programId &&
    r.effective_from <= date &&
    (!r.effective_to || r.effective_to > date)
  )
  if (programRate) return programRate.rate_per_hour

  const defaultRate = rates.find(r =>
    !r.class_id && !r.program_id &&
    r.effective_from <= date &&
    (!r.effective_to || r.effective_to > date)
  )
  return defaultRate?.rate_per_hour ?? 0
}

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

  const [recordsRes, ratesRes] = await Promise.all([
    admin.from('attendance_records')
      .select(`
        coach_ps_number, class_id, date, status,
        coaches!inner(name),
        classes!inner(class_type, class_identifier, duration_minutes, program_id,
          clubs!inner(name, region_id, regions(name)),
          programs!inner(name, id)
        )
      `)
      .gte('date', firstDay)
      .lte('date', lastDay)
      .eq('status', 'P'),
    admin.from('class_rates').select('class_id, program_id, rate_per_hour, effective_from, effective_to'),
  ])

  const records = recordsRes.data ?? []
  const rates = (ratesRes.data ?? []) as RateRow[]

  // Group by club → coach
  type CoachEntry = {
    name: string
    ps_number: string
    sessions: number
    hours: number
    rate: number
    total: number
  }
  type ClubEntry = { name: string; coaches: CoachEntry[]; subtotal: number }

  const byClub: Record<string, ClubEntry> = {}

  for (const r of records as any[]) {
    const clubName: string = r.classes?.clubs?.name ?? 'Unknown Club'
    const coachName: string = r.coaches?.name ?? r.coach_ps_number
    const durationMin: number = r.classes?.duration_minutes ?? 60
    const hours = durationMin / 60
    const programId: string = r.classes?.programs?.id ?? r.classes?.program_id ?? ''
    const rate = getRate(rates, r.class_id, programId, r.date)

    if (!byClub[clubName]) byClub[clubName] = { name: clubName, coaches: [], subtotal: 0 }
    const club = byClub[clubName]

    let coach = club.coaches.find(c => c.ps_number === r.coach_ps_number)
    if (!coach) {
      coach = { name: coachName, ps_number: r.coach_ps_number, sessions: 0, hours: 0, rate, total: 0 }
      club.coaches.push(coach)
    }
    coach.sessions++
    coach.hours += hours
    coach.total += hours * rate
  }

  // Compute subtotals
  let grandTotal = 0
  for (const club of Object.values(byClub)) {
    club.subtotal = club.coaches.reduce((s, c) => s + c.total, 0)
    grandTotal += club.subtotal
    club.coaches.forEach(c => { c.rate = c.total / c.hours || 0 })
  }

  // Generate PDF
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  // Header
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('UAEJJF Clubs — Payroll Report', pageW / 2, 20, { align: 'center' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`${MONTHS[month - 1]} ${year}`, pageW / 2, 28, { align: 'center' })

  let y = 36

  for (const club of Object.values(byClub).sort((a, b) => a.name.localeCompare(b.name))) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(club.name, 14, y + 4)
    y += 6

    const rows = club.coaches.map(c => [
      c.name,
      c.ps_number,
      c.sessions.toString(),
      c.hours.toFixed(2),
      `AED ${c.rate.toFixed(2)}`,
      `AED ${c.total.toFixed(2)}`,
    ])
    rows.push([
      { content: 'Club Subtotal', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } } as any,
      { content: `AED ${club.subtotal.toFixed(2)}`, styles: { fontStyle: 'bold' } },
    ])

    autoTable(doc, {
      startY: y,
      head: [['Coach Name', 'PS No.', 'Sessions', 'Hours', 'Rate/hr', 'Total']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      tableWidth: pageW - 28,
    })

    y = (doc as any).lastAutoTable.finalY + 8
    if (y > 260) { doc.addPage(); y = 20 }
  }

  // Grand total
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`Grand Total: AED ${grandTotal.toFixed(2)}`, pageW - 14, y + 6, { align: 'right' })

  const pdfBytes = doc.output('arraybuffer')

  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="UAEJJF_Payroll_${MONTHS[month - 1]}_${year}.pdf"`,
    },
  })
}
