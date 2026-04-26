import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

export async function POST(req: NextRequest) {
  const { type, coach_ps_number, supervisor_id, dates } = await req.json()

  const supabase = await createAdminClient()

  // Fetch coach details
  const { data: coach } = await supabase
    .from('coaches')
    .select('name, email')
    .eq('ps_number', coach_ps_number)
    .single()

  // Fetch supervisor details
  const { data: supervisor } = await supabase
    .from('supervisors')
    .select('name, email, whatsapp')
    .eq('id', supervisor_id)
    .single()

  if (!coach || !supervisor) return NextResponse.json({ ok: false })

  const dateList = (dates as string[]).join(', ')

  // Email to coach
  if (coach.email) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: coach.email,
      subject: `[UAEJJF] Attendance reminder — ${dateList}`,
      html: `
        <p>Dear ${coach.name},</p>
        <p>Your attendance has not been submitted for <strong>${dateList}</strong>.</p>
        <p>Please log in and submit your attendance as soon as possible.</p>
        <p>If you have already resolved this, please disregard this message.</p>
        <br/>
        <p>UAEJJF Attendance System</p>
      `,
    }).catch(() => {})
  }

  // Email to supervisor (on 2-day miss)
  if (type === 'consecutive_miss' && supervisor.email) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: supervisor.email,
      subject: `[UAEJJF Alert] Coach ${coach.name} missed 2+ days`,
      html: `
        <p>Dear ${supervisor.name},</p>
        <p>Coach <strong>${coach.name}</strong> (${coach_ps_number}) has not submitted attendance for <strong>${dateList}</strong>.</p>
        <p>Please follow up to resolve this.</p>
        <br/>
        <p>UAEJJF Attendance System</p>
      `,
    }).catch(() => {})
  }

  // WhatsApp to supervisor (if configured)
  if (type === 'consecutive_miss' && supervisor.whatsapp && process.env.WHATSAPP_API_TOKEN) {
    await sendWhatsApp(supervisor.whatsapp, `⚠️ UAEJJF Alert: Coach ${coach.name} (${coach_ps_number}) missed attendance on ${dateList}. Please follow up.`)
  }

  return NextResponse.json({ ok: true })
}

async function sendWhatsApp(to: string, message: string) {
  const phone = to.replace(/\D/g, '')
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
        text: { body: message },
      }),
    }
  ).catch(() => {})
}
