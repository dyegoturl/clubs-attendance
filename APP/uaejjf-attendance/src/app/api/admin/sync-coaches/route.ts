import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const SHEET_ID = '1UiaSqyFJp6uHv-SAgxOBy7kAnTe4icb6Lj-efpDgOpY'
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Data`

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseDate(val: string, rejectFuture = false): string | null {
  if (!val) return null
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return null
    if (rejectFuture && d > new Date()) return null
    return d.toISOString().split('T')[0]
  } catch {
    return null
  }
}

function mapGender(val: string): 'Male' | 'Female' | null {
  const v = val.trim().toUpperCase()
  if (v === 'MALE') return 'Male'
  if (v === 'FEMALE') return 'Female'
  return null
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient() : supabase

  // Fetch sheet as CSV
  const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' })
  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch Google Sheet' }, { status: 502 })
  const csv = await res.text()

  const lines = csv.split('\n').filter(l => l.trim())
  const [headerLine, ...dataLines] = lines

  // Detect column indices from header
  const headers = parseCSVLine(headerLine).map(h => h.toUpperCase().replace(/\s+/g, ''))
  const col = (name: string) => headers.indexOf(name)
  const iPS = col('PSNUMBER')
  const iName = col('NAME')
  const iEmail = col('EMAIL')
  const iPhone = col('PHONE')
  const iGender = col('GENDER')
  const iDOB = col('DOB')
  const iDOJ = col('DOJ')

  if (iPS === -1 || iName === -1) {
    return NextResponse.json({ error: 'Could not find required columns in sheet' }, { status: 422 })
  }

  const sheetPsNumbers = new Set<string>()
  const rows: Array<{
    ps_number: string
    name: string
    email: string | null
    phone: string | null
    gender: 'Male' | 'Female' | null
    date_of_birth: string | null
    start_date: string | null
    active: boolean
  }> = []

  for (const line of dataLines) {
    const cols = parseCSVLine(line)
    const ps = cols[iPS]?.toUpperCase().trim()
    if (!ps || !/^PS\d+$/i.test(ps)) continue

    const name = cols[iName]?.trim()
    if (!name) continue

    sheetPsNumbers.add(ps)
    rows.push({
      ps_number: ps,
      name,
      email: cols[iEmail]?.trim() || null,
      phone: iPhone !== -1 ? (cols[iPhone]?.trim() || null) : null,
      gender: (iGender !== -1 ? mapGender(cols[iGender] ?? '') : null) as 'Male' | 'Female' | null,
      date_of_birth: iDOB !== -1 ? parseDate(cols[iDOB] ?? '', true) : null,
      start_date: iDOJ !== -1 ? parseDate(cols[iDOJ] ?? '', false) : null,
      active: true,
    })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid coaches found in sheet' }, { status: 422 })
  }

  // Upsert in batches of 500
  let upsertErrors = 0
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from('coaches').upsert(rows.slice(i, i + BATCH), {
      onConflict: 'ps_number',
      ignoreDuplicates: false,
    })
    if (error) upsertErrors++
  }

  // Deactivate coaches not in the sheet
  const psArray = Array.from(sheetPsNumbers)
  const { data: deactivated, error: deactErr } = await db
    .from('coaches')
    .update({ active: false })
    .eq('active', true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter('ps_number', 'not.in', `(${psArray.join(',')})` as any)
    .select('ps_number')

  // Log in audit
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'sync_coaches',
    target_type: 'coaches',
    target_id: 'sheet',
    metadata: {
      total_in_sheet: rows.length,
      deactivated: deactivated?.length ?? 0,
      upsert_batches: Math.ceil(rows.length / BATCH),
      errors: upsertErrors + (deactErr ? 1 : 0),
    },
  })

  return NextResponse.json({
    ok: true,
    total: rows.length,
    deactivated: deactivated?.length ?? 0,
    errors: upsertErrors + (deactErr ? 1 : 0),
  })
}
