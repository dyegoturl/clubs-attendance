import { redirect } from 'next/navigation'

// Root page redirects to login — middleware handles auth routing
export default function RootPage() {
  redirect('/login')
}
