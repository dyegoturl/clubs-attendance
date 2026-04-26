import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shared/AppShell'
import AlertsFeed from '@/components/supervisor/AlertsFeed'

export default async function SupervisorAlertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'supervisor') redirect('/login')

  const { data: supervisor } = await supabase
    .from('supervisors').select('id, name').eq('user_id', user.id).single()
  if (!supervisor) redirect('/login')

  const { data: alerts } = await supabase
    .from('alerts')
    .select('id, type, coach_ps_number, data, is_read, created_at')
    .eq('supervisor_id', supervisor.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Get coach names for alert display
  const psNumbers = Array.from(new Set((alerts ?? []).map(a => a.coach_ps_number).filter((ps): ps is string => ps !== null)))
  const { data: coaches } = psNumbers.length
    ? await supabase.from('coaches').select('ps_number, name').in('ps_number', psNumbers)
    : { data: [] }

  const coachMap = Object.fromEntries((coaches ?? []).map(c => [c.ps_number, c.name]))
  const unreadCount = (alerts ?? []).filter(a => !a.is_read).length

  return (
    <AppShell role="supervisor" userName={supervisor.name} alertCount={unreadCount}>
      <AlertsFeed
        alerts={(alerts ?? []).map(a => ({ ...a, coach_name: (a.coach_ps_number ? coachMap[a.coach_ps_number] : null) ?? a.coach_ps_number ?? '' }))}
        supervisorId={supervisor.id}
      />
    </AppShell>
  )
}
