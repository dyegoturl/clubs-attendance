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

  const { attendance_id, status, notes, supervisor_id } = await req.json()
  if (!attendance_id || !status) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = await createAdminClient()

  const { data: record } = await admin
    .from('attendance_records')
    .select('coach_ps_number')
    .eq('id', attendance_id)
    .single()

  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await admin
    .from('attendance_records')
    .update({ status, notes: notes ?? null })
    .eq('id', attendance_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'supervisor_edit_attendance',
    target_type: 'attendance_records',
    target_id: attendance_id,
    metadata: { status, notes, supervisor_id },
  })

  return NextResponse.json({ ok: true })
}
