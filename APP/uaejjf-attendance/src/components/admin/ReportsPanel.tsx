'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { FileDown, FileText, Loader2, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  year: number
  month: number
  records: unknown[]
  rates: unknown[]
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function ReportsPanel({ year, month: initialMonth, records, rates }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)
  const [selectedYear, setSelectedYear] = useState(year)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingPayroll, setExportingPayroll] = useState(false)

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear]

  async function doExport(type: 'excel' | 'pdf' | 'payroll') {
    const setter = type === 'excel' ? setExportingExcel : type === 'pdf' ? setExportingPdf : setExportingPayroll
    setter(true)
    try {
      const res = await fetch(`/api/exports/${type}?year=${selectedYear}&month=${selectedMonth}`)
      if (!res.ok) { toast.error('Export failed'); return }

      const blob = await res.blob()
      const ext = type === 'excel' ? 'xlsx' : 'pdf'
      const fileName = `UAEJJF_${MONTHS[selectedMonth - 1]}_${selectedYear}_${type}.${ext}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Export error') }
    finally { setter(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Reports & Export</h1>
        <p className="text-sm text-slate-400 mt-0.5">Generate monthly attendance and payroll reports</p>
      </div>

      {/* Month/Year selector */}
      <div className="flex gap-2">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(Number(e.target.value))}
          className="bg-[#1a1d27] border border-[#2e3350] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="bg-[#1a1d27] border border-[#2e3350] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary */}
      <div className="bg-[#1a1d27] rounded-xl border border-[#2e3350] p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </h2>
        </div>
        <p className="text-xs text-slate-400">{(records as unknown[]).length} attendance records available for this month</p>
      </div>

      {/* Export buttons */}
      <div className="space-y-3">
        <div className="bg-[#1a1d27] border border-[#2e3350] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-1">Monthly Attendance</h3>
          <p className="text-xs text-slate-400 mb-3">Full attendance detail per coach and class</p>
          <div className="flex gap-2">
            <button
              onClick={() => doExport('excel')}
              disabled={exportingExcel}
              className="flex-1 flex items-center justify-center gap-2 bg-green-700/20 hover:bg-green-700/30 border border-green-600/30 text-green-300 text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {exportingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Excel (.xlsx)
            </button>
            <button
              onClick={() => doExport('pdf')}
              disabled={exportingPdf}
              className="flex-1 flex items-center justify-center gap-2 bg-red-700/20 hover:bg-red-700/30 border border-red-600/30 text-red-300 text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              PDF
            </button>
          </div>
        </div>

        <div className="bg-[#1a1d27] border border-[#2e3350] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-1">Consolidated Payroll Report</h3>
          <p className="text-xs text-slate-400 mb-3">Hours × Rate grouped by club with totals (UAEJJF PDF layout)</p>
          <button
            onClick={() => doExport('payroll')}
            disabled={exportingPayroll}
            className="w-full flex items-center justify-center gap-2 bg-yellow-700/20 hover:bg-yellow-700/30 border border-yellow-600/30 text-yellow-300 text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {exportingPayroll ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Generate Payroll PDF
          </button>
        </div>
      </div>
    </div>
  )
}
