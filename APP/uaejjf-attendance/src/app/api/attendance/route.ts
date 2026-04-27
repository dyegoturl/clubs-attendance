import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isLateReport } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { class_id, date, status, student_count, notes, is_adhoc, coach_ps_number, proxy_by } = body

  if (!class_id || !date || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Determine if this is a proxy submission (supervisor/admin reporting on behalf of coach)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isProxy = proxy_by && (profile?.role === 'supervisor' || profile?.role === 'admin')

  if (!isProxy) {
    // Normal coach flow: verify ownership
    const { data: coach } = await supabase
      .from('coaches')
      .select('ps_number')
      .eq('user_id', user.id)
      .single()

    if (!coach || coach.ps_number !== coach_ps_number) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Check if attendance already exists for this class/date
  const { data: existing } = await supabase
    .from('attendance_records')
    .select('id, submitted_at')
    .eq('class_id', class_id)
    .eq('date', date)
    .single()

  const late = isLateReport(date)

  // If very old (> 2 days), create an edit request instead of direct update
  const classDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  classDate.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - classDate.getTime()) / (1000 * 60 * 60 * 24))

  if (existing && diffDays > 2) {
    // Create edit request requiring supervisor approval
    const { error } = await supabase.from('attendance_edit_requests').insert({
      attendance_id: existing.id,
      class_id,
      coach_ps_number,
      requested_date: date,
      requested_status: status,
      requested_student_count: student_count ?? null,
      requested_notes: notes ?? null,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ edit_request: true })
  }

  // Validate MOI student count
  const { data: classData } = await supabase
    .from('active_coach_assignments')
    .select('requires_student_count')
    .eq('class_id', class_id)
    .eq('coach_ps_number', coach_ps_number)
    .single()

  if (classData?.requires_student_count && status === 'P' && (student_count == null || student_count < 0)) {
    return NextResponse.json({ error: 'Student count required for MOI classes' }, { status: 400 })
  }

  if (existing) {
    // Update existing record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = { status, student_count: student_count ?? null, notes: notes ?? null }
    if (isProxy) { updates.modified_by_id = user.id; updates.modified_at = new Date().toISOString() }
    const { error } = await supabase
      .from('attendance_records')
      .update(updates)
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Insert new record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: any = {
      class_id,
      coach_ps_number,
      date,
      status,
      student_count: student_count ?? null,
      notes: notes ?? null,
      is_adhoc: is_adhoc ?? false,
    }
    if (isProxy) record.modified_by_id = user.id
    const { error } = await supabase.from('attendance_records').insert(record)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Check for consecutive misses to alert supervisor
  if (status !== 'P') {
    await checkConsecutiveMisses(supabase, coach_ps_number, date)
  }

  return NextResponse.json({ success: true, late_report: late })
}

async function checkConsecutiveMisses(supabase: Awaited<ReturnType<typeof createClient>>, psNumber: string, date: string) {
  // Look at last 2 scheduled days for this coach
  const { data: recent } = await supabase
    .from('attendance_records')
    .select('date, status')
    .eq('coach_ps_number', psNumber)
    .lte('date', date)
    .order('date', { ascending: false })
    .limit(2)

  if (!recent || recent.length < 2) return

  const allMissed = recent.every(r => r.status !== 'P')
  if (allMissed) {
    // Get supervisor for this coach
    const { data: assignment } = await supabase
      .from('supervisor_coach_assignments')
      .select('supervisor_id')
      .eq('coach_ps_number', psNumber)
      .is('end_date', null)
      .single()

    if (assignment?.supervisor_id) {
      // Create in-app alert
      await supabase.from('alerts').insert({
        type: 'consecutive_miss',
        coach_ps_number: psNumber,
        supervisor_id: assignment.supervisor_id,
        data: { dates: recent.map(r => r.date), statuses: recent.map(r => r.status) },
      })

      // Trigger email notification
      await fetch('/api/alerts/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'consecutive_miss',
          coach_ps_number: psNumber,
          supervisor_id: assignment.supervisor_id,
          dates: recent.map(r => r.date),
        }),
      }).catch(() => {}) // non-blocking
    }
  }
}
