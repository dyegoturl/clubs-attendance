-- ═══════════════════════════════════════════════════════════════
-- UAEJJF Clubs Attendance System — Initial Schema
-- ═══════════════════════════════════════════════════════════════

-- ── EXTENSIONS ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ENUMS ───────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'coach');
CREATE TYPE class_type AS ENUM ('Kids and Youth', 'Juvenile and Adults');
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Mix');
CREATE TYPE attendance_status AS ENUM ('P', 'C', 'H', 'N', 'R');
CREATE TYPE alert_type AS ENUM ('consecutive_miss', 'unassigned_class', 'late_report', 'edit_request', 'pending_approval');
CREATE TYPE edit_request_status AS ENUM ('pending', 'approved', 'rejected');

-- ── PROGRAMS ─────────────────────────────────────────────────────
-- Two programs: MOI and UAEJJ Clubs
CREATE TABLE programs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL UNIQUE,          -- 'MOI' | 'UAEJJ Clubs'
  requires_student_count BOOLEAN NOT NULL DEFAULT FALSE, -- MOI requires student count
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO programs (name, requires_student_count) VALUES
  ('UAEJJ Clubs', FALSE),
  ('MOI', TRUE);

-- ── REGIONS ──────────────────────────────────────────────────────
CREATE TABLE regions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO regions (name) VALUES
  ('Abu Dhabi'), ('Al Ain'), ('Ajman'), ('Dubai'),
  ('Sharjah'), ('RAK'), ('Al Dhafra');

-- ── CLUBS ────────────────────────────────────────────────────────
CREATE TABLE clubs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  region_id  UUID NOT NULL REFERENCES regions(id),
  program_id UUID NOT NULL REFERENCES programs(id),
  is_regular BOOLEAN NOT NULL DEFAULT TRUE, -- Al Dhafra = FALSE
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, program_id)
);

-- ── PROFILES ─────────────────────────────────────────────────────
-- Extends Supabase auth.users for all roles
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL,
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  whatsapp      TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── COACHES ──────────────────────────────────────────────────────
CREATE TABLE coaches (
  ps_number       TEXT PRIMARY KEY,                   -- e.g. 'PS2117'
  user_id         UUID UNIQUE REFERENCES auth.users(id),
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  date_of_birth   DATE,
  start_date      DATE,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SUPERVISORS ──────────────────────────────────────────────────
CREATE TABLE supervisors (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID UNIQUE REFERENCES auth.users(id),
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  whatsapp   TEXT,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SUPERVISOR → COACH ASSIGNMENTS ──────────────────────────────
CREATE TABLE supervisor_coach_assignments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supervisor_id     UUID NOT NULL REFERENCES supervisors(id),
  coach_ps_number   TEXT NOT NULL REFERENCES coaches(ps_number),
  start_date        DATE NOT NULL,
  end_date          DATE,                              -- NULL = currently active
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sca_coach ON supervisor_coach_assignments(coach_ps_number);
CREATE INDEX idx_sca_supervisor ON supervisor_coach_assignments(supervisor_id);

-- ── CLASSES ──────────────────────────────────────────────────────
CREATE TABLE classes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id          UUID NOT NULL REFERENCES clubs(id),
  class_identifier TEXT,                              -- '#1', 'Team 777 #1', '#Advanced'
  gender           gender_type NOT NULL DEFAULT 'Mix',
  type             class_type NOT NULL,
  time_start       TIME,
  time_end         TIME,
  days_of_week     TEXT[] NOT NULL DEFAULT '{}',      -- ['Mon','Tue','Wed','Thu']
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classes_club ON classes(club_id);

-- ── COACH-CLASS ASSIGNMENTS ──────────────────────────────────────
-- A coach can be assigned to a class from a specific date (supports mid-month reassignment)
CREATE TABLE coach_class_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_ps_number TEXT NOT NULL REFERENCES coaches(ps_number),
  class_id        UUID NOT NULL REFERENCES classes(id),
  class_rate      DECIMAL(10,2),                      -- hourly rate for payroll report
  start_date      DATE NOT NULL,
  end_date        DATE,                               -- NULL = currently active
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by     UUID REFERENCES supervisors(id),    -- supervisor who approved reassignment
  approved_at     TIMESTAMPTZ
);

CREATE INDEX idx_cca_coach ON coach_class_assignments(coach_ps_number);
CREATE INDEX idx_cca_class ON coach_class_assignments(class_id);

-- ── ATTENDANCE RECORDS ───────────────────────────────────────────
CREATE TABLE attendance_records (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id           UUID NOT NULL REFERENCES classes(id),
  coach_ps_number    TEXT NOT NULL REFERENCES coaches(ps_number),
  date               DATE NOT NULL,
  status             attendance_status NOT NULL,
  student_count      INTEGER,                         -- required for MOI when status = P
  notes              TEXT,
  is_adhoc           BOOLEAN NOT NULL DEFAULT FALSE,  -- class ran on unscheduled day
  is_late_report     BOOLEAN NOT NULL DEFAULT FALSE,  -- submitted > 1 day after class date
  submitted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_by_id     UUID REFERENCES supervisors(id), -- if supervisor overrode
  modified_at        TIMESTAMPTZ,
  UNIQUE(class_id, date)
);

CREATE INDEX idx_ar_class ON attendance_records(class_id);
CREATE INDEX idx_ar_coach ON attendance_records(coach_ps_number);
CREATE INDEX idx_ar_date ON attendance_records(date);

-- ── COACH REASSIGNMENT REQUESTS ──────────────────────────────────
-- Supervisors must approve coach changes to class assignments
CREATE TABLE reassignment_requests (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id             UUID NOT NULL REFERENCES classes(id),
  current_coach_ps     TEXT REFERENCES coaches(ps_number),
  new_coach_ps         TEXT NOT NULL REFERENCES coaches(ps_number),
  effective_date       DATE NOT NULL,
  requested_by_id      UUID NOT NULL REFERENCES supervisors(id),
  status               edit_request_status NOT NULL DEFAULT 'pending',
  reviewed_by_id       UUID REFERENCES supervisors(id),
  reviewed_at          TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ATTENDANCE EDIT REQUESTS ─────────────────────────────────────
-- When coach submits past attendance > 1 day, supervisor approval required
CREATE TABLE attendance_edit_requests (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id           UUID REFERENCES attendance_records(id),
  class_id                UUID NOT NULL REFERENCES classes(id),
  coach_ps_number         TEXT NOT NULL REFERENCES coaches(ps_number),
  requested_date          DATE NOT NULL,
  requested_status        attendance_status NOT NULL,
  requested_student_count INTEGER,
  requested_notes         TEXT,
  reason                  TEXT,
  status                  edit_request_status NOT NULL DEFAULT 'pending',
  reviewed_by_id          UUID REFERENCES supervisors(id),
  reviewed_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ALERTS ───────────────────────────────────────────────────────
CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            alert_type NOT NULL,
  coach_ps_number TEXT REFERENCES coaches(ps_number),
  supervisor_id   UUID REFERENCES supervisors(id),    -- NULL = all supervisors
  data            JSONB NOT NULL DEFAULT '{}',
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_supervisor ON alerts(supervisor_id);
CREATE INDEX idx_alerts_coach ON alerts(coach_ps_number);
CREATE INDEX idx_alerts_read ON alerts(is_read);

-- ── AUDIT LOG ────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID,
  actor_role  user_role,
  actor_name  TEXT,
  action      TEXT NOT NULL,
  table_name  TEXT,
  record_id   TEXT,
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE programs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors                ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_coach_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_class_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reassignment_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_edit_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                  ENABLE ROW LEVEL SECURITY;

-- ── HELPER FUNCTIONS ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_coach_ps_number()
RETURNS TEXT AS $$
  SELECT ps_number FROM coaches WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_supervisor_id()
RETURNS UUID AS $$
  SELECT id FROM supervisors WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── RLS: READ-ONLY REFERENCE DATA (all authenticated) ────────────

CREATE POLICY "Authenticated read programs"
  ON programs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read regions"
  ON regions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read clubs"
  ON clubs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read classes"
  ON classes FOR SELECT TO authenticated USING (true);

-- ── RLS: PROFILES ────────────────────────────────────────────────

CREATE POLICY "Own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admin reads all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'supervisor'));

CREATE POLICY "Admin manages profiles"
  ON profiles FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

-- ── RLS: COACHES ─────────────────────────────────────────────────

CREATE POLICY "Coach reads own record"
  ON coaches FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Supervisor and admin read all coaches"
  ON coaches FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'supervisor'));

CREATE POLICY "Admin manages coaches"
  ON coaches FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

-- ── RLS: ATTENDANCE RECORDS ──────────────────────────────────────

-- Coach reads only own attendance
CREATE POLICY "Coach reads own attendance"
  ON attendance_records FOR SELECT TO authenticated
  USING (coach_ps_number = get_coach_ps_number());

-- Coach submits own attendance
CREATE POLICY "Coach inserts own attendance"
  ON attendance_records FOR INSERT TO authenticated
  WITH CHECK (
    coach_ps_number = get_coach_ps_number()
    AND get_user_role() = 'coach'
  );

-- Coach updates own recent attendance (same day or next day)
CREATE POLICY "Coach updates recent own attendance"
  ON attendance_records FOR UPDATE TO authenticated
  USING (
    coach_ps_number = get_coach_ps_number()
    AND date >= CURRENT_DATE - INTERVAL '1 day'
  );

-- Supervisor and admin read all attendance
CREATE POLICY "Supervisor reads all attendance"
  ON attendance_records FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'supervisor'));

-- Supervisor overrides any attendance
CREATE POLICY "Supervisor updates any attendance"
  ON attendance_records FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'supervisor'));

-- ── RLS: ALERTS ──────────────────────────────────────────────────

CREATE POLICY "Supervisor reads own alerts"
  ON alerts FOR SELECT TO authenticated
  USING (
    supervisor_id = get_supervisor_id()
    OR get_user_role() = 'admin'
  );

CREATE POLICY "Supervisor updates own alerts"
  ON alerts FOR UPDATE TO authenticated
  USING (
    supervisor_id = get_supervisor_id()
    OR get_user_role() = 'admin'
  );

-- ── RLS: AUDIT LOG ───────────────────────────────────────────────

CREATE POLICY "Admin reads audit log"
  ON audit_log FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

-- ── RLS: COACH CLASS ASSIGNMENTS ─────────────────────────────────

CREATE POLICY "Coach reads own assignments"
  ON coach_class_assignments FOR SELECT TO authenticated
  USING (coach_ps_number = get_coach_ps_number());

CREATE POLICY "Supervisor reads all assignments"
  ON coach_class_assignments FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'supervisor'));

CREATE POLICY "Admin manages assignments"
  ON coach_class_assignments FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'supervisor'));

-- ── RLS: EDIT REQUESTS ───────────────────────────────────────────

CREATE POLICY "Coach reads own edit requests"
  ON attendance_edit_requests FOR SELECT TO authenticated
  USING (coach_ps_number = get_coach_ps_number());

CREATE POLICY "Coach creates edit requests"
  ON attendance_edit_requests FOR INSERT TO authenticated
  WITH CHECK (
    coach_ps_number = get_coach_ps_number()
    AND get_user_role() = 'coach'
  );

CREATE POLICY "Supervisor manages edit requests"
  ON attendance_edit_requests FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'supervisor'));

-- ══════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ══════════════════════════════════════════════════════════════════

-- Auto-flag late reports: > 1 day after class date = late
CREATE OR REPLACE FUNCTION set_late_report_flag()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_late_report := NEW.date < CURRENT_DATE - INTERVAL '1 day';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_late_report
  BEFORE INSERT OR UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION set_late_report_flag();

-- Update updated_at on coaches
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_coaches_updated
  BEFORE UPDATE ON coaches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── VIEW: ACTIVE COACH ASSIGNMENTS ───────────────────────────────
CREATE OR REPLACE VIEW active_coach_assignments AS
SELECT
  cca.id,
  cca.coach_ps_number,
  c.name AS coach_name,
  cca.class_id,
  cl.club_id,
  clubs.name AS club_name,
  clubs.program_id,
  p.name AS program_name,
  p.requires_student_count,
  r.name AS region_name,
  cl.class_identifier,
  cl.gender,
  cl.type AS class_type,
  cl.time_start,
  cl.time_end,
  cl.days_of_week,
  cca.class_rate,
  cca.start_date
FROM coach_class_assignments cca
JOIN coaches c ON c.ps_number = cca.coach_ps_number
JOIN classes cl ON cl.id = cca.class_id
JOIN clubs ON clubs.id = cl.club_id
JOIN programs p ON p.id = clubs.program_id
JOIN regions r ON r.id = clubs.region_id
WHERE cca.end_date IS NULL
  AND cl.active = TRUE
  AND clubs.active = TRUE;

-- ── VIEW: DAILY ATTENDANCE STATUS ────────────────────────────────
CREATE OR REPLACE VIEW daily_attendance_status AS
SELECT
  aca.*,
  ar.id AS attendance_id,
  ar.status,
  ar.student_count,
  ar.notes,
  ar.is_late_report,
  ar.is_adhoc,
  ar.submitted_at,
  CURRENT_DATE AS today
FROM active_coach_assignments aca
LEFT JOIN attendance_records ar
  ON ar.class_id = aca.class_id
  AND ar.date = CURRENT_DATE
  AND ar.coach_ps_number = aca.coach_ps_number;
