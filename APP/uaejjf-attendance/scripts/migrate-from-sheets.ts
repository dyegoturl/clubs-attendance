/**
 * One-shot migration: reads parsed coach/class data and seeds Supabase.
 *
 * Run with:  npx tsx scripts/migrate-from-sheets.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'
import { generateDefaultPassword } from '../src/lib/utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ── DATA EXTRACTED FROM GOOGLE SHEETS ───────────────────────────────────────
// Full data from: https://docs.google.com/spreadsheets/d/14HMf6gqCwkw7qTi07koVgBemZ9zWCCnTufLjaV-UTyc/

const SUPERVISORS = [
  { name: 'Khalid Rashed Al Zaabi', email: 'k.alzaabi@uaejjf.ae', whatsapp: null },
  { name: 'Jaber Hamad Al Khateri', email: 'j.alkhateri@uaejjf.ae', whatsapp: null },
  { name: 'Mubarak Suhail Ghanim', email: 'm.ghanim@uaejjf.ae', whatsapp: null },
]

const CLUBS_DATA = [
  // { region, program, club_name, is_regular }
  { region: 'Abu Dhabi', program: 'UAEJJ Clubs', club_name: 'Shahama Club', is_regular: true },
  { region: 'Abu Dhabi', program: 'UAEJJ Clubs', club_name: 'Al Jazira Club', is_regular: true },
  { region: 'Abu Dhabi', program: 'UAEJJ Clubs', club_name: 'Al Wahda Club', is_regular: true },
  { region: 'Abu Dhabi', program: 'UAEJJ Clubs', club_name: 'Bani Yas Club', is_regular: true },
  { region: 'Abu Dhabi', program: 'UAEJJ Clubs', club_name: 'Al Nasr Club', is_regular: true },
  { region: 'Abu Dhabi', program: 'UAEJJ Clubs', club_name: 'Al Dhafra', is_regular: false },
  { region: 'Al Ain', program: 'UAEJJ Clubs', club_name: 'Al Ain Club', is_regular: true },
  { region: 'Al Ain', program: 'UAEJJ Clubs', club_name: 'Al Buraimi', is_regular: true },
  { region: 'Al Ain', program: 'UAEJJ Clubs', club_name: 'Al Ain Sports Club', is_regular: true },
  { region: 'Dubai', program: 'UAEJJ Clubs', club_name: 'Al Wasl Club', is_regular: true },
  { region: 'Dubai', program: 'UAEJJ Clubs', club_name: 'Al Shorta Club', is_regular: true },
  { region: 'Sharjah', program: 'UAEJJ Clubs', club_name: 'Sharjah Club', is_regular: true },
  { region: 'Ajman', program: 'UAEJJ Clubs', club_name: 'Ajman Club', is_regular: true },
  { region: 'RAK', program: 'UAEJJ Clubs', club_name: 'RAK Club', is_regular: true },
]

interface CoachData {
  ps_number: string
  name: string
  email: string | null
  date_of_birth: string // YYYY-MM-DD
  gender: 'Male' | 'Female'
  supervisor_name: string
  classes: {
    club_name: string
    class_type: 'Kids and Youth' | 'Juvenile and Adults'
    class_identifier: string | null
    time_start: string // HH:MM:SS
    time_end: string   // HH:MM:SS
    days_of_week: string[]
    duration_minutes: number
  }[]
}

// Coaches extracted from Google Sheets
// NOTE: Add real data here from the spreadsheet analysis.
// This is a template with a few example entries for structure.
const COACHES: CoachData[] = [
  {
    ps_number: '12345',
    name: 'Ahmed Al Hammadi',
    email: 'ahmed.hammadi@example.com',
    date_of_birth: '1990-05-15',
    gender: 'Male',
    supervisor_name: 'Khalid Rashed Al Zaabi',
    classes: [
      {
        club_name: 'Shahama Club',
        class_type: 'Kids and Youth',
        class_identifier: 'Shahama - Kids Mon/Wed',
        time_start: '17:00:00',
        time_end: '18:30:00',
        days_of_week: ['monday', 'wednesday'],
        duration_minutes: 90,
      },
    ],
  },
  // Add all coaches here from the spreadsheet…
]

// ── MIGRATION LOGIC ──────────────────────────────────────────────────────────

async function run() {
  console.log('Starting migration…')

  // 1. Fetch region and program IDs
  const { data: regions } = await supabase.from('regions').select('id, name')
  const { data: programs } = await supabase.from('programs').select('id, name')

  if (!regions || !programs) { console.error('Failed to fetch regions/programs'); process.exit(1) }

  const regionMap: Record<string, string> = Object.fromEntries(regions.map(r => [r.name, r.id]))
  const programMap: Record<string, string> = Object.fromEntries(programs.map(p => [p.name, p.id]))

  // 2. Seed supervisors
  console.log('Seeding supervisors…')
  const supervisorIdMap: Record<string, string> = {}

  for (const sup of SUPERVISORS) {
    // Create auth user
    const email = sup.email ?? `sup_${Date.now()}@uaejjf.internal`
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: 'SupervisorTemp2024!',
      email_confirm: true,
    })
    if (authErr && !authErr.message.includes('already exists')) {
      console.error(`Auth error for supervisor ${sup.name}:`, authErr.message)
      continue
    }

    const userId = authUser?.user?.id
    if (!userId) continue

    // Create profile
    await supabase.from('profiles').upsert({ id: userId, role: 'supervisor', name: sup.name })

    // Create supervisor record
    const { data: supRecord } = await supabase
      .from('supervisors')
      .upsert({ user_id: userId, name: sup.name, email: sup.email, whatsapp: sup.whatsapp })
      .select('id')
      .single()

    if (supRecord) supervisorIdMap[sup.name] = supRecord.id
    console.log(`  ✓ Supervisor: ${sup.name}`)
  }

  // 3. Seed clubs
  console.log('Seeding clubs…')
  const clubIdMap: Record<string, string> = {}

  for (const club of CLUBS_DATA) {
    const regionId = regionMap[club.region]
    const programId = programMap[club.program]
    if (!regionId || !programId) {
      console.warn(`  ⚠ Unknown region/program for club ${club.club_name}`)
      continue
    }

    const { data: clubRecord } = await supabase
      .from('clubs')
      .upsert({ name: club.club_name, region_id: regionId, program_id: programId, is_regular: club.is_regular, is_active: true })
      .select('id')
      .single()

    if (clubRecord) clubIdMap[club.club_name] = clubRecord.id
    console.log(`  ✓ Club: ${club.club_name}`)
  }

  // 4. Seed coaches and their class assignments
  console.log('Seeding coaches…')

  for (const coachData of COACHES) {
    const defaultPassword = generateDefaultPassword(coachData.date_of_birth, coachData.ps_number)
    const email = coachData.email ?? `coach_${coachData.ps_number}@uaejjf.internal`

    // Create auth user
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
    })

    if (authErr && !authErr.message.includes('already exists')) {
      console.error(`  ✗ Auth error for coach ${coachData.name}:`, authErr.message)
      continue
    }

    let userId = authUser?.user?.id
    if (!userId) {
      // User might already exist — look up by email
      const { data: existing } = await supabase.auth.admin.listUsers()
      const found = existing?.users?.find(u => u.email === email)
      if (found) userId = found.id
    }
    if (!userId) continue

    // Create profile
    await supabase.from('profiles').upsert({ id: userId, role: 'coach', name: coachData.name })

    // Create coach record
    await supabase.from('coaches').upsert({
      ps_number: coachData.ps_number,
      user_id: userId,
      name: coachData.name,
      email: coachData.email,
      date_of_birth: coachData.date_of_birth,
      gender: coachData.gender,
    })

    // Assign to supervisor
    const supervisorId = supervisorIdMap[coachData.supervisor_name]
    if (supervisorId) {
      await supabase.from('supervisor_coach_assignments').upsert({
        supervisor_id: supervisorId,
        coach_ps_number: coachData.ps_number,
        start_date: '2025-01-01',
      })
    }

    // Create classes and assignments
    const { data: uaejjProgram } = await supabase.from('programs').select('id').eq('name', 'UAEJJ Clubs').single()

    for (const cls of coachData.classes) {
      const clubId = clubIdMap[cls.club_name]
      if (!clubId) { console.warn(`  ⚠ Club not found: ${cls.club_name}`); continue }

      // Get or create class
      const { data: existingClass } = await supabase
        .from('classes')
        .select('id')
        .eq('club_id', clubId)
        .eq('class_type', cls.class_type)
        .eq('time_start', cls.time_start)
        .maybeSingle()

      let classId = existingClass?.id

      if (!classId) {
        const { data: newClass } = await supabase.from('classes').insert({
          club_id: clubId,
          program_id: uaejjProgram?.id,
          class_type: cls.class_type,
          class_identifier: cls.class_identifier,
          time_start: cls.time_start,
          time_end: cls.time_end,
          days_of_week: cls.days_of_week,
          duration_minutes: cls.duration_minutes,
          is_active: true,
        }).select('id').single()
        classId = newClass?.id
      }

      if (!classId) continue

      await supabase.from('coach_class_assignments').upsert({
        coach_ps_number: coachData.ps_number,
        class_id: classId,
        start_date: '2025-01-01',
      })
    }

    console.log(`  ✓ Coach: ${coachData.name} (PS ${coachData.ps_number})`)
  }

  console.log('\nMigration complete!')
}

run().catch(err => { console.error('Migration failed:', err); process.exit(1) })
