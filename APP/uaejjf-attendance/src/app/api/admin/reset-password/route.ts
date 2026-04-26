import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateDefaultPassword } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { ps_number } = await req.json()
  if (!ps_number) return NextResponse.json({ error: 'Missing ps_number' }, { status: 400 })

  const admin = await createAdminClient()

  const { data: coach } = await admin
    .from('coaches')
    .select('ps_number, date_of_birth, user_id')
    .eq('ps_number', ps_number)
    .single()

  if (!coach || !coach.date_of_birth || !coach.user_id) {
    return NextResponse.json({ error: 'Coach not found or missing date of birth' }, { status: 404 })
  }

  const newPassword = generateDefaultPassword(coach.date_of_birth, ps_number)

  const { error } = await admin.auth.admin.updateUserById(coach.user_id, { password: newPassword })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'reset_password',
    target_type: 'coaches',
    target_id: ps_number,
    metadata: { reset_by: user.id },
  })

  return NextResponse.json({ ok: true })
}
