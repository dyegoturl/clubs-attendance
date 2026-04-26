import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

// Called by Vercel Cron every Monday at 08:00 UAE time (UTC+4 = 04:00 UTC)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await createAdminClient()
  const now = new Date()

  // Last 7 days
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const from = weekAgo.toISOString().split('T')[0]
  const to = now.toISOString().split('T')[0]

  const { data: records } = await admin
    .from('attendance_records')
    .select(`
      coach_ps_number, date, status, is_late_report,
      coaches!inner(name),
      classes!inner(clubs!inner(name), programs!inner(name))
    `)
    .gte('date', from)
    .lte('date', to)

  const { data: supervisors } = await admin
    .from('supervisors')
    .select('id, name, email')
    .not('email', 'is', null)

  const { data: scaAll } = await admin
    .from('supervisor_coach_assignments')
    .select('supervisor_id, coach_ps_number')
    .is('end_date', null)

  // For each supervisor, send their coaches' summary
  for (const supervisor of supervisors ?? []) {
    if (!supervisor.email) continue

    const coachPs = (scaAll ?? [])
      .filter(s => s.supervisor_id === supervisor.id)
      .map(s => s.coach_ps_number)

    const supRecords = (records ?? []).filter((r: any) => coachPs.includes(r.coach_ps_number))
    const present = supRecords.filter((r: any) => r.status === 'P').length
    const absent = supRecords.filter((r: any) => r.status !== 'P').length
    const late = supRecords.filter((r: any) => r.is_late_report).length

    const coachSummary: Record<string, { name: string; present: number; absent: number }> = {}
    for (const r of supRecords as any[]) {
      if (!coachSummary[r.coach_ps_number]) {
        coachSummary[r.coach_ps_number] = { name: r.coaches?.name ?? r.coach_ps_number, present: 0, absent: 0 }
      }
      if (r.status === 'P') coachSummary[r.coach_ps_number].present++
      else coachSummary[r.coach_ps_number].absent++
    }

    const rows = Object.values(coachSummary)
      .map(c => `<tr><td style="padding:4px 8px">${c.name}</td><td style="padding:4px 8px;text-align:center">${c.present}</td><td style="padding:4px 8px;text-align:center">${c.absent}</td></tr>`)
      .join('')

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: supervisor.email,
      subject: `[UAEJJF] Weekly Attendance Report — ${from} to ${to}`,
      html: `
        <h2>Weekly Report for ${supervisor.name}</h2>
        <p>Period: ${from} to ${to}</p>
        <p><strong>Summary:</strong> ${present} present · ${absent} absent · ${late} late reports</p>
        <table border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;min-width:300px">
          <thead><tr style="background:#1e2940;color:white">
            <th style="padding:6px 8px;text-align:left">Coach</th>
            <th style="padding:6px 8px">Present</th>
            <th style="padding:6px 8px">Absent</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="3" style="padding:8px;text-align:center">No records this week</td></tr>'}</tbody>
        </table>
        <br/><p>UAEJJF Attendance System</p>
      `,
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, sent: supervisors?.length ?? 0 })
}
