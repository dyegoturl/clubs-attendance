-- ── FIX: audit_log — rename to match code conventions ─────────────
-- Code uses: target_type, target_id, metadata
-- Schema had: table_name, record_id, old_data/new_data
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS target_type TEXT,
  ADD COLUMN IF NOT EXISTS target_id   TEXT,
  ADD COLUMN IF NOT EXISTS metadata    JSONB;

-- Migrate existing data (if any)
UPDATE audit_log SET target_type = table_name, target_id = record_id WHERE target_type IS NULL;

-- ── FIX: classes — add missing columns ────────────────────────────
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS program_id      UUID REFERENCES programs(id),
  ADD COLUMN IF NOT EXISTS class_type      class_type,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN NOT NULL DEFAULT TRUE;

-- Migrate 'type' column to 'class_type' if needed
UPDATE classes SET class_type = type::class_type WHERE class_type IS NULL AND type IS NOT NULL;

-- ── FIX: coaches — add gender column ──────────────────────────────
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS gender gender_type;

-- ── FIX: clubs — ensure is_active column exists ───────────────────
-- (migration 002 handles the rename; this is a fallback)
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ── FIX: attendance_edit_requests — add reviewed_by (UUID → auth.users) ──
ALTER TABLE attendance_edit_requests
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);

-- ── UPDATED: active_coach_assignments view ─────────────────────────
CREATE OR REPLACE VIEW active_coach_assignments AS
SELECT
  cca.id,
  cca.coach_ps_number,
  co.name                 AS coach_name,
  cca.class_id,
  cl.club_id,
  clubs.name              AS club_name,
  COALESCE(cl.program_id, clubs.program_id) AS program_id,
  prog.name               AS program_name,
  prog.requires_student_count,
  reg.name                AS region_name,
  cl.class_identifier,
  cl.gender,
  COALESCE(cl.class_type, cl.type::class_type) AS class_type,
  cl.time_start,
  cl.time_end,
  cl.days_of_week,
  cl.duration_minutes,
  cca.start_date
FROM coach_class_assignments cca
JOIN coaches co      ON co.ps_number = cca.coach_ps_number
JOIN classes cl      ON cl.id = cca.class_id
JOIN clubs           ON clubs.id = cl.club_id
JOIN programs prog   ON prog.id = COALESCE(cl.program_id, clubs.program_id)
LEFT JOIN regions reg ON reg.id = clubs.region_id
WHERE cca.end_date IS NULL
  AND COALESCE(cl.is_active, cl.active, TRUE) = TRUE
  AND COALESCE(clubs.is_active, clubs.active, TRUE) = TRUE;

-- ── UPDATED: daily_attendance_status view ─────────────────────────
CREATE OR REPLACE VIEW daily_attendance_status AS
SELECT
  aca.*,
  ar.id           AS attendance_id,
  ar.status,
  ar.student_count,
  ar.notes,
  ar.is_late_report,
  ar.is_adhoc,
  ar.submitted_at,
  CURRENT_DATE::TEXT AS today
FROM active_coach_assignments aca
LEFT JOIN attendance_records ar
  ON ar.class_id = aca.class_id
  AND ar.coach_ps_number = aca.coach_ps_number
  AND ar.date = CURRENT_DATE;
