'use client'

import Link from 'next/link'
import { Users, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Coach {
  ps_number: string
  name: string
  email: string | null
  stats: { present: number; late: number; absent: number }
}

interface Props {
  coaches: Coach[]
}

export default function SupervisorCoachesList({ coaches }: Props) {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">My Coaches</h1>
        <p className="text-sm text-slate-400 mt-0.5">{coaches.length} coach{coaches.length !== 1 ? 'es' : ''} assigned to you</p>
      </div>

      <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2e3350]">
          <Users className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Coach List — This Month</h2>
        </div>

        {coaches.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-500">No coaches assigned</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#2e3350]">
            {coaches.map(coach => (
              <li key={coach.ps_number}>
                <Link href={`/supervisor/coaches/${coach.ps_number}`}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-[#22263a] transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                      {coach.name}
                    </p>
                    <p className="text-xs text-slate-500">PS {coach.ps_number}</p>
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-xs text-green-400">{coach.stats.present} present</span>
                      {coach.stats.late > 0 && (
                        <span className="text-xs text-orange-400">{coach.stats.late} late</span>
                      )}
                      {coach.stats.absent > 0 && (
                        <span className="text-xs text-red-400">{coach.stats.absent} absent</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
