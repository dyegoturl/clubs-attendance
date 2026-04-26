export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      programs: {
        Row: { id: string; name: string; requires_student_count: boolean; active: boolean; created_at: string }
        Insert: { id?: string; name: string; requires_student_count?: boolean; active?: boolean; created_at?: string }
        Update: { id?: string; name?: string; requires_student_count?: boolean; active?: boolean }
        Relationships: []
      }
      regions: {
        Row: { id: string; name: string; active: boolean; created_at: string }
        Insert: { id?: string; name: string; active?: boolean; created_at?: string }
        Update: { id?: string; name?: string; active?: boolean }
        Relationships: []
      }
      clubs: {
        Row: { id: string; name: string; region_id: string; program_id: string; is_regular: boolean; is_active: boolean; created_at: string }
        Insert: { id?: string; name: string; region_id: string; program_id: string; is_regular?: boolean; is_active?: boolean }
        Update: { id?: string; name?: string; region_id?: string; program_id?: string; is_regular?: boolean; is_active?: boolean }
        Relationships: [
          { foreignKeyName: "clubs_region_id_fkey"; columns: ["region_id"]; isOneToOne: false; referencedRelation: "regions"; referencedColumns: ["id"] },
          { foreignKeyName: "clubs_program_id_fkey"; columns: ["program_id"]; isOneToOne: false; referencedRelation: "programs"; referencedColumns: ["id"] }
        ]
      }
      profiles: {
        Row: { id: string; role: 'admin' | 'supervisor' | 'coach'; name: string; email: string | null; phone: string | null; whatsapp: string | null; active: boolean; created_at: string; updated_at: string }
        Insert: { id: string; role: 'admin' | 'supervisor' | 'coach'; name: string; email?: string | null; phone?: string | null; whatsapp?: string | null; active?: boolean }
        Update: { role?: 'admin' | 'supervisor' | 'coach'; name?: string; email?: string | null; phone?: string | null; whatsapp?: string | null; active?: boolean }
        Relationships: []
      }
      coaches: {
        Row: { ps_number: string; user_id: string | null; name: string; email: string | null; phone: string | null; date_of_birth: string | null; gender: 'Male' | 'Female' | null; start_date: string | null; active: boolean; project: string | null; sheet_supervisor: string | null; created_at: string; updated_at: string }
        Insert: { ps_number: string; user_id?: string | null; name: string; email?: string | null; phone?: string | null; date_of_birth?: string | null; gender?: 'Male' | 'Female' | null; start_date?: string | null; active?: boolean; project?: string | null; sheet_supervisor?: string | null }
        Update: { user_id?: string | null; name?: string; email?: string | null; phone?: string | null; date_of_birth?: string | null; gender?: 'Male' | 'Female' | null; start_date?: string | null; active?: boolean; project?: string | null; sheet_supervisor?: string | null }
        Relationships: []
      }
      supervisors: {
        Row: { id: string; user_id: string | null; name: string; email: string | null; phone: string | null; whatsapp: string | null; active: boolean; created_at: string }
        Insert: { id?: string; user_id?: string | null; name: string; email?: string | null; phone?: string | null; whatsapp?: string | null; active?: boolean }
        Update: { user_id?: string | null; name?: string; email?: string | null; phone?: string | null; whatsapp?: string | null; active?: boolean }
        Relationships: []
      }
      supervisor_coach_assignments: {
        Row: { id: string; supervisor_id: string; coach_ps_number: string; start_date: string; end_date: string | null; created_at: string }
        Insert: { id?: string; supervisor_id: string; coach_ps_number: string; start_date: string; end_date?: string | null }
        Update: { end_date?: string | null }
        Relationships: [
          { foreignKeyName: "sca_supervisor_id_fkey"; columns: ["supervisor_id"]; isOneToOne: false; referencedRelation: "supervisors"; referencedColumns: ["id"] },
          { foreignKeyName: "sca_coach_ps_number_fkey"; columns: ["coach_ps_number"]; isOneToOne: false; referencedRelation: "coaches"; referencedColumns: ["ps_number"] }
        ]
      }
      classes: {
        Row: { id: string; club_id: string; program_id: string | null; class_identifier: string | null; class_type: 'Kids and Youth' | 'Juvenile and Adults' | null; gender: 'Male' | 'Female' | 'Mix'; time_start: string | null; time_end: string | null; days_of_week: string[]; duration_minutes: number | null; is_active: boolean; created_at: string }
        Insert: { id?: string; club_id: string; program_id?: string | null; class_identifier?: string | null; class_type?: 'Kids and Youth' | 'Juvenile and Adults' | null; gender?: 'Male' | 'Female' | 'Mix'; time_start?: string | null; time_end?: string | null; days_of_week?: string[]; duration_minutes?: number | null; is_active?: boolean }
        Update: { club_id?: string; program_id?: string | null; class_identifier?: string | null; class_type?: 'Kids and Youth' | 'Juvenile and Adults' | null; gender?: 'Male' | 'Female' | 'Mix'; time_start?: string | null; time_end?: string | null; days_of_week?: string[]; duration_minutes?: number | null; is_active?: boolean }
        Relationships: [
          { foreignKeyName: "classes_club_id_fkey"; columns: ["club_id"]; isOneToOne: false; referencedRelation: "clubs"; referencedColumns: ["id"] }
        ]
      }
      coach_class_assignments: {
        Row: { id: string; coach_ps_number: string; class_id: string; start_date: string; end_date: string | null; created_at: string; approved_by: string | null; approved_at: string | null }
        Insert: { id?: string; coach_ps_number: string; class_id: string; start_date: string; end_date?: string | null; approved_by?: string | null; approved_at?: string | null }
        Update: { coach_ps_number?: string; class_id?: string; start_date?: string; end_date?: string | null; approved_by?: string | null; approved_at?: string | null }
        Relationships: [
          { foreignKeyName: "cca_coach_ps_number_fkey"; columns: ["coach_ps_number"]; isOneToOne: false; referencedRelation: "coaches"; referencedColumns: ["ps_number"] },
          { foreignKeyName: "cca_class_id_fkey"; columns: ["class_id"]; isOneToOne: false; referencedRelation: "classes"; referencedColumns: ["id"] }
        ]
      }
      attendance_records: {
        Row: { id: string; class_id: string; coach_ps_number: string; date: string; status: 'P' | 'C' | 'H' | 'N' | 'R'; student_count: number | null; notes: string | null; is_adhoc: boolean; is_late_report: boolean; submitted_at: string; modified_by_id: string | null; modified_at: string | null }
        Insert: { id?: string; class_id: string; coach_ps_number: string; date: string; status: 'P' | 'C' | 'H' | 'N' | 'R'; student_count?: number | null; notes?: string | null; is_adhoc?: boolean; submitted_at?: string }
        Update: { status?: 'P' | 'C' | 'H' | 'N' | 'R'; student_count?: number | null; notes?: string | null; is_adhoc?: boolean; modified_by_id?: string | null; modified_at?: string | null }
        Relationships: [
          { foreignKeyName: "ar_class_id_fkey"; columns: ["class_id"]; isOneToOne: false; referencedRelation: "classes"; referencedColumns: ["id"] },
          { foreignKeyName: "ar_coach_ps_number_fkey"; columns: ["coach_ps_number"]; isOneToOne: false; referencedRelation: "coaches"; referencedColumns: ["ps_number"] }
        ]
      }
      attendance_edit_requests: {
        Row: { id: string; attendance_id: string | null; class_id: string; coach_ps_number: string; requested_date: string; requested_status: 'P' | 'C' | 'H' | 'N' | 'R'; requested_student_count: number | null; requested_notes: string | null; reason: string | null; status: 'pending' | 'approved' | 'rejected'; reviewed_by: string | null; reviewed_at: string | null; created_at: string }
        Insert: { id?: string; attendance_id?: string | null; class_id: string; coach_ps_number: string; requested_date: string; requested_status: 'P' | 'C' | 'H' | 'N' | 'R'; requested_student_count?: number | null; requested_notes?: string | null; reason?: string | null }
        Update: { status?: 'pending' | 'approved' | 'rejected'; reviewed_by?: string | null; reviewed_at?: string | null }
        Relationships: []
      }
      alerts: {
        Row: { id: string; type: 'consecutive_miss' | 'unassigned_class' | 'late_report' | 'edit_request' | 'pending_approval'; coach_ps_number: string | null; supervisor_id: string | null; data: Json; is_read: boolean; created_at: string }
        Insert: { id?: string; type: 'consecutive_miss' | 'unassigned_class' | 'late_report' | 'edit_request' | 'pending_approval'; coach_ps_number?: string | null; supervisor_id?: string | null; data?: Json; is_read?: boolean }
        Update: { is_read?: boolean }
        Relationships: []
      }
      class_rates: {
        Row: { id: string; class_id: string | null; program_id: string | null; rate_per_hour: number; effective_from: string; effective_to: string | null; created_by: string | null; created_at: string }
        Insert: { id?: string; class_id?: string | null; program_id?: string | null; rate_per_hour: number; effective_from: string; effective_to?: string | null; created_by?: string | null }
        Update: { rate_per_hour?: number; effective_from?: string; effective_to?: string | null }
        Relationships: []
      }
      audit_log: {
        Row: { id: string; actor_id: string | null; action: string; target_type: string | null; target_id: string | null; metadata: Json | null; created_at: string }
        Insert: { id?: string; actor_id?: string | null; action: string; target_type?: string | null; target_id?: string | null; metadata?: Json | null }
        Update: never
        Relationships: []
      }
      reassignment_requests: {
        Row: { id: string; coach_ps_number: string; from_class_id: string; to_class_id: string; requested_by: string | null; approved_by: string | null; approved_at: string | null; status: 'pending' | 'approved' | 'rejected'; created_at: string }
        Insert: { id?: string; coach_ps_number: string; from_class_id: string; to_class_id: string; requested_by?: string | null }
        Update: { approved_by?: string | null; approved_at?: string | null; status?: 'pending' | 'approved' | 'rejected' }
        Relationships: []
      }
    }
    Views: {
      active_coach_assignments: {
        Row: {
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
          gender: 'Male' | 'Female' | 'Mix'
          class_type: 'Kids and Youth' | 'Juvenile and Adults'
          time_start: string | null
          time_end: string | null
          days_of_week: string[]
          duration_minutes: number | null
          start_date: string
        }
        Relationships: []
      }
      daily_attendance_status: {
        Row: {
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
          gender: 'Male' | 'Female' | 'Mix'
          class_type: 'Kids and Youth' | 'Juvenile and Adults'
          time_start: string | null
          time_end: string | null
          days_of_week: string[]
          duration_minutes: number | null
          start_date: string
          attendance_id: string | null
          status: 'P' | 'C' | 'H' | 'N' | 'R' | null
          student_count: number | null
          notes: string | null
          is_late_report: boolean | null
          is_adhoc: boolean | null
          submitted_at: string | null
          today: string
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role: { Args: Record<never, never>; Returns: 'admin' | 'supervisor' | 'coach' }
      get_coach_ps_number: { Args: Record<never, never>; Returns: string }
      get_supervisor_id: { Args: Record<never, never>; Returns: string }
    }
    Enums: {
      user_role: 'admin' | 'supervisor' | 'coach'
      class_type: 'Kids and Youth' | 'Juvenile and Adults'
      gender_type: 'Male' | 'Female' | 'Mix'
      attendance_status: 'P' | 'C' | 'H' | 'N' | 'R'
      alert_type: 'consecutive_miss' | 'unassigned_class' | 'late_report' | 'edit_request' | 'pending_approval'
      edit_request_status: 'pending' | 'approved' | 'rejected'
    }
    CompositeTypes: Record<string, never>
  }
}
