import type { Json } from './database'

export type UserRole = 'admin' | 'supervisor' | 'coach'
export type ClassType = 'Kids and Youth' | 'Juvenile and Adults'
export type GenderType = 'Male' | 'Female' | 'Mix'
export type AttendanceStatus = 'P' | 'C' | 'H' | 'N' | 'R'
export type AlertType = 'consecutive_miss' | 'unassigned_class' | 'late_report' | 'edit_request' | 'pending_approval'
export type EditRequestStatus = 'pending' | 'approved' | 'rejected'

export interface Program {
  id: string
  name: string
  requires_student_count: boolean
  active: boolean
  created_at: string
}

export interface Region {
  id: string
  name: string
  active: boolean
}

export interface Club {
  id: string
  name: string
  region_id: string
  program_id: string
  is_regular: boolean
  is_active: boolean
  region?: Region
  program?: Program
}

export interface Coach {
  ps_number: string
  user_id: string | null
  name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  gender: 'Male' | 'Female' | null
  start_date: string | null
  active: boolean
  created_at: string
}

export interface Supervisor {
  id: string
  user_id: string | null
  name: string
  email: string | null
  phone: string | null
  whatsapp: string | null
  active: boolean
}

export interface Profile {
  id: string
  role: UserRole
  name: string
  email: string | null
  phone: string | null
  active: boolean
}

export interface Class {
  id: string
  club_id: string
  program_id: string | null
  class_identifier: string | null
  class_type: ClassType | null
  gender: GenderType
  time_start: string | null
  time_end: string | null
  days_of_week: string[]
  duration_minutes: number | null
  is_active: boolean
  club?: Club
}

export interface CoachClassAssignment {
  id: string
  coach_ps_number: string
  class_id: string
  start_date: string
  end_date: string | null
  coach?: Coach
  class?: Class
}

export interface AttendanceRecord {
  id: string
  class_id: string
  coach_ps_number: string
  date: string
  status: AttendanceStatus
  student_count: number | null
  notes: string | null
  is_adhoc: boolean
  is_late_report: boolean
  submitted_at: string
  modified_by_id: string | null
  modified_at: string | null
}

export interface Alert {
  id: string
  type: AlertType
  coach_ps_number: string | null
  supervisor_id: string | null
  data: Json
  is_read: boolean
  created_at: string
}

export interface AttendanceEditRequest {
  id: string
  attendance_id: string | null
  class_id: string
  coach_ps_number: string
  requested_date: string
  requested_status: AttendanceStatus
  requested_student_count: number | null
  requested_notes: string | null
  reason: string | null
  status: EditRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

// ── COMPOSITE TYPES ───────────────────────────────────────────────

export interface ActiveCoachAssignment {
  id: string
  coach_ps_number: string
  coach_name: string
  class_id: string
  club_id: string
  club_name: string
  program_id: string
  program_name: string
  requires_student_count: boolean
  region_name: string | null
  class_identifier: string | null
  gender: GenderType
  class_type: ClassType
  time_start: string | null
  time_end: string | null
  days_of_week: string[]
  duration_minutes: number | null
  start_date: string
}

export interface DailyAttendanceStatus extends ActiveCoachAssignment {
  attendance_id: string | null
  status: AttendanceStatus | null
  student_count: number | null
  notes: string | null
  is_late_report: boolean | null
  is_adhoc: boolean | null
  submitted_at: string | null
  today: string
}

// ── REPORT TYPES ─────────────────────────────────────────────────

export interface ConsolidatedReportRow {
  club_name: string
  ps_number: string
  coach_name: string
  class_type: ClassType
  worked_hours: number
  class_rate: number | null
  total: number
  additional_info: string
}

export interface ConsolidatedReportClub {
  club_name: string
  rows: ConsolidatedReportRow[]
  total_hours: number
  total_amount: number
}

export interface MonthlyAttendanceRow {
  row_number: number
  region: string
  club: string
  gender: GenderType
  class_id_label: string
  time: string
  type: ClassType
  ps_number: string
  coach: string
  total_students: number
  avg_per_class: number
  daily: Record<string, AttendanceStatus | null>
  attendance_count: number
  absence_count: number
  notes: string
}

// ── STATS TYPES ───────────────────────────────────────────────────

export interface RegionStats {
  region_name: string
  total_student_sessions: number
  total_classes: number
  avg_per_session: number
}

export interface ClubStats {
  club_name: string
  region_name: string
  total_student_sessions: number
  total_classes: number
  avg_per_session: number
  kids_hours: number
  adults_hours: number
}

export interface CoachStats {
  ps_number: string
  coach_name: string
  club_name: string
  worked_hours: number
  total_sessions: number
  cancelled_sessions: number
  compliance_rate: number
  late_reports: number
}
