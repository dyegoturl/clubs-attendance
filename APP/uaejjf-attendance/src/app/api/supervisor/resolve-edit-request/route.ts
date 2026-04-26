import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'supervisor' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { request_id, approve, supervisor_id } = await req.json()
  if (!request_id || approve === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = await createAdminClient()

  // Fetch the edit request
  const { data: editReq } = await admin
    .from('attendance_edit_requests')
    .select('attendance_id, requested_status, requested_student_count, requested_notes')
    .eq('id', request_id)
    .single()

  if (!editReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newStatus = approve ? 'approved' : 'rejected'

  // Update request status
  const { error: updateErr } = await admin
    .from('attendance_edit_requests')
    .update({ status: newStatus, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', request_id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // If approved, apply the edit to the actual record
  if (approve) {
    const { error: applyErr } = await admin
      .from('attendance_records')
      .update({
        status: editReq.requested_status,
        student_count: editReq.requested_student_count ?? null,
        notes: editReq.requested_notes ?? null,
      })
      .eq('id', editReq.attendance_id!)

    if (applyErr) return NextResponse.json({ error: applyErr.message }, { status: 500 })
  }

  // Audit log
  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: approve ? 'approve_edit_request' : 'reject_edit_request',
    target_type: 'attendance_edit_requests',
    target_id: request_id,
    metadata: { supervisor_id, approve },
  })

  return NextResponse.json({ ok: true })
}
