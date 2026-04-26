'use client'

import { useState } from 'react'
import { RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Users } from 'lucide-react'

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1UiaSqyFJp6uHv-SAgxOBy7kAnTe4icb6Lj-efpDgOpY/edit'

interface SyncResult {
  total: number
  deactivated: number
  errors: number
}

export default function SyncSettings() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/sync-coaches', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Sync failed')
      } else {
        setResult(json)
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">System configuration and data sync</p>
      </div>

      {/* Sync Card */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-xl p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Coach Sheet Sync</h2>
            <p className="text-sm text-slate-400 mt-1">
              Pulls all coaches from the UAEJJF master Google Sheet, adds any new entries to the
              system, and marks coaches who have been removed from the sheet as inactive.
            </p>
          </div>
        </div>

        {/* Sheet source */}
        <div className="flex items-center gap-2 bg-[#0f1117] rounded-lg px-4 py-3 border border-[#2e3350]">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Source</span>
          <a
            href={SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm transition-colors truncate"
          >
            UAEJJF Coaches Sheet — Data!A1:M10000
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          </a>
        </div>

        {/* What it does */}
        <ul className="space-y-1.5 text-sm text-slate-400">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            Upserts all coaches from the sheet (creates new, updates existing)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            Coaches without class assignments stay unassigned until manually linked
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
            Coaches absent from the sheet are marked <span className="text-amber-400 font-medium">inactive</span>
          </li>
        </ul>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>

        {/* Result */}
        {result && (
          <div className="bg-[#0f1117] rounded-lg border border-[#2e3350] p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Sync complete
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{result.total}</p>
                <p className="text-xs text-slate-400 mt-0.5">In sheet</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{result.deactivated}</p>
                <p className="text-xs text-slate-400 mt-0.5">Deactivated</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${result.errors > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  {result.errors}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Errors</p>
              </div>
            </div>
            {result.errors > 0 && (
              <p className="text-xs text-red-400">
                Some records had errors. Check the Audit Log for details.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Stats hint */}
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <Users className="w-3.5 h-3.5" />
        After sync, view coaches in Users → Coaches tab
      </div>
    </div>
  )
}
