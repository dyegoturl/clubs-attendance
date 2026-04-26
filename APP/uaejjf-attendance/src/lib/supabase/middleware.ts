import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api/cron')) {
    if (user && pathname.startsWith('/login')) {
      const profile = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const role = profile.data?.role
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = role === 'admin' ? '/admin/dashboard'
        : role === 'supervisor' ? '/supervisor/dashboard'
        : '/coach/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
    return supabaseResponse
  }

  // Redirect unauthenticated users to login
  if (!user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // Role-based route guarding
  const profile = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile.data?.role

  if (pathname.startsWith('/admin') && role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = role === 'supervisor' ? '/supervisor/dashboard' : '/coach/dashboard'
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/supervisor') && role === 'coach') {
    const url = request.nextUrl.clone()
    url.pathname = '/coach/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
