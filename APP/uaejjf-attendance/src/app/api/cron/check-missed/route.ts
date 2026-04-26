import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

// Called daily at 22:00 UAE time (18:00 UTC) to check for missed attendance
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // Get all coaches with active assignments
  const { data: activeAssignments } = await admin
    .from('active_coach_assignments')
    .select('coach_ps_number, class_id')

  if (!activeAssignments?.length) return NextResponse.json({ ok: true, checked: 0 })

  const psNumbers = Array.from(new Set(activeAssignments.map(a => a.coach_ps_number)))

  // Get yesterday's attendance
  const { data: yesterdayRecords } = await admin
    .from('attendance_records')
    .select('coach_ps_number, status')
    .in('coach_ps_number', psNumbers)
    .eq('date', yesterday)

  const submittedYesterday = new Set((yesterdayRecords ?? []).map(r => r.coach_ps_number))
  const missedYesterday = psNumbers.filter(ps => !submittedYesterday.has(ps))

  if (!missedYesterday.length) return NextResponse.json({ ok: true, checked: psNumbers.length, missed: 0 })

  // Fetch coach details
  const { data: coaches } = await admin
    .from('coaches')
    .select('ps_number, name, email')
    .in('ps_number', missedYesterday)

  // Fetch supervisor assignments
  const { data: scaData } = await admin
    .from('supervisor_coach_assignments')
    .select('coach_ps_number, supervisor_id')
    .in('coach_ps_number', missedYesterday)
    .is('end_date', null)

  const { data: supervisors } = await admin
    .from('supervisors')
    .select('id, name, email, whatsapp')

  const supMap = Object.fromEntries((supervisors ?? []).map(s => [s.id, s]))
  const coachSupMap: Record<string, string> = {}
  for (const sca of scaData ?? []) coachSupMap[sca.coach_ps_number] = sca.supervisor_id

  let notified = 0
  for (const coach of coaches ?? []) {
    if (!coach.email) continue

    // Email to coach
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: coach.email,
      subject: `[UAEJJF] Missing attendance for ${yesterday}`,
      html: `
        <p>Dear ${coach.name},</p>
        <p>Your attendance has not been submitted for <strong>${yesterday}</strong>.</p>
        <p>Please log in and submit as soon as possible.</p>
        <p>UAEJJF Attendance System</p>
      `,
    }).catch(() => {})
    notified++

    // Check if this coach also missed 2 days (yesterday + day before)
    const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]
    const { data: dayBeforeRecord } = await admin
      .from('attendance_records')
      .select('id')
      .eq('coach_ps_number', coach.ps_number)
      .eq('date', dayBefore)
      .single()

    if (!dayBeforeRecord) {
      // 2 consecutive misses — alert supervisor
      const supervisorId = coachSupMap[coach.ps_number]
      const supervisor = supervisorId ? supMap[supervisorId] : null

      if (supervisor) {
        await admin.from('alerts').insert({
          type: 'consecutive_miss',
          coach_ps_number: coach.ps_number,
          supervisor_id: supervisorId,
          data: { dates: [dayBefore, yesterday] },
        })

        if (supervisor.email) {
          await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: supervisor.email,
            subject: `[UAEJJF Alert] Coach ${coach.name} missed 2+ days`,
            html: `
              <p>Dear ${supervisor.name},</p>
              <p>Coach <strong>${coach.name}</strong> (${coach.ps_number}) has not submitted attendance for ${dayBefore} and ${yesterday}.</p>
              <p>Please follow up.</p>
              <p>UAEJJF Attendance System</p>
            `,
          }).catch(() => {})
        }

        if (supervisor.whatsapp && process.env.WHATSAPP_API_TOKEN) {
          const phone = supervisor.whatsapp.replace(/\D/g, '')
          await fetch(
            `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: phone,
                type: 'text',
                text: { body: `⚠️ UAEJJF: Coach ${coach.name} (${coach.ps_number}) missed attendance on ${dayBefore} and ${yesterday}. Please follow up.` },
              }),
            }
          ).catch(() => {})
        }
      }
    }
  }

  return NextResponse.json({ ok: true, checked: psNumbers.length, missed: missedYesterday.length, notified })
}
