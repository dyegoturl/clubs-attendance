import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import AuditLog from '@/components/admin/AuditLog'

export default async function AdminAuditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const admin = await createAdminClient()

  const { data: logs } = await admin
    .from('audit_log')
    .select('id, actor_id, action, target_type, target_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  // Get actor names
  const actorIds = Array.from(new Set((logs ?? []).map(l => l.actor_id).filter((id): id is string => id !== null)))
  const { data: actors } = actorIds.length
    ? await admin.from('profiles').select('id, name').in('id', actorIds)
    : { data: [] }

  const actorMap = Object.fromEntries((actors ?? []).map(a => [a.id, a.name]))

  return (
    <AppShell role="admin" userName={profile?.name ?? 'Admin'}>
      <AuditLog
        logs={(logs ?? []).map(l => ({
          ...l,
          actor_name: actorMap[l.actor_id ?? ''] ?? 'System',
        }))}
      />
    </AppShell>
  )
}
