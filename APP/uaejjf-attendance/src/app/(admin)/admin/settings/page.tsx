import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import SyncSettings from '@/components/admin/SyncSettings'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  return (
    <AppShell role="admin" userName={profile?.name ?? 'Admin'}>
      <SyncSettings />
    </AppShell>
  )
}
