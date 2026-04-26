import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { class_id, program_id, rate_per_hour, effective_from } = await req.json()
  if (!rate_per_hour || !effective_from) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = await createAdminClient()

  // Close any currently open rate for the same scope
  const query = admin.from('class_rates').update({ effective_to: effective_from }).is('effective_to', null)
  if (class_id) query.eq('class_id', class_id)
  else if (program_id) query.eq('program_id', program_id).is('class_id', null)
  else query.is('class_id', null).is('program_id', null)
  await query

  const { data, error } = await admin.from('class_rates').insert({
    class_id: class_id ?? null,
    program_id: program_id ?? null,
    rate_per_hour,
    effective_from,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'set_class_rate',
    target_type: 'class_rates',
    target_id: data.id,
    metadata: { class_id, program_id, rate_per_hour, effective_from },
  })

  return NextResponse.json({ data })
}
