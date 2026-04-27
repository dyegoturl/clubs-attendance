'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  ps_number: z.string().min(1, 'PS Number is required').toUpperCase(),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    try {
      // Resolve email: coaches use PS number → email lookup; admins/supervisors type email directly
      let loginEmail = data.ps_number
      if (!data.ps_number.includes('@')) {
        const { data: coach } = await supabase
          .from('coaches')
          .select('email')
          .eq('ps_number', data.ps_number.toUpperCase())
          .single()
        if (!coach?.email) {
          toast.error('PS Number not found. Check your credentials.')
          return
        }
        loginEmail = coach.email
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: data.password,
      })
      if (error || !authData.user) {
        toast.error('Incorrect password. Try again.')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      const role = profile?.role
      if (role === 'admin') router.push('/admin/dashboard')
      else if (role === 'supervisor') router.push('/supervisor/dashboard')
      else router.push('/coach/dashboard')

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4">
            <ShieldCheck className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">UAEJJF Attendance</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in with your PS Number or email</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              PS Number / Email
            </label>
            <input
              {...register('ps_number')}
              placeholder="PS2117"
              autoCapitalize="characters"
              className="w-full bg-[#1a1d27] border border-[#2e3350] rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
            />
            {errors.ps_number && (
              <p className="mt-1 text-xs text-red-400">{errors.ps_number.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••"
                className="w-full bg-[#1a1d27] border border-[#2e3350] rounded-lg px-4 py-3 pr-11 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-6">
          Default password: DDMMYYYY + last 2 digits of PS number
        </p>
      </div>
    </div>
  )
}
