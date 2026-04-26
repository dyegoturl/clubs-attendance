import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'supervisor' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { alert_id, supervisor_id, mark_all } = await req.json()

  if (mark_all && supervisor_id) {
    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('supervisor_id', supervisor_id)
      .eq('is_read', false)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (alert_id) {
    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', alert_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
