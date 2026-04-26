-- ── CLASS RATES ───────────────────────────────────────────────────
-- Admin-only. Coaches cannot see this table (no RLS SELECT for coach role).
-- Priority: class-specific > program-wide > default (no class_id, no program_id).
CREATE TABLE class_rates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id        UUID REFERENCES classes(id) ON DELETE CASCADE,
  program_id      UUID REFERENCES programs(id) ON DELETE CASCADE,
  rate_per_hour   NUMERIC(10, 2) NOT NULL CHECK (rate_per_hour >= 0),
  effective_from  DATE NOT NULL,
  effective_to    DATE,                 -- NULL = currently active
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT no_class_and_program CHECK (NOT (class_id IS NOT NULL AND program_id IS NOT NULL))
);

CREATE INDEX idx_class_rates_class   ON class_rates(class_id);
CREATE INDEX idx_class_rates_program ON class_rates(program_id);

ALTER TABLE class_rates ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write rates
CREATE POLICY "Admin manages rates"
  ON class_rates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── ATTENDANCE_EDIT_REQUESTS: add reviewed_by + reviewed_at ───────
-- (Add cols if not already present — safe to re-run with IF NOT EXISTS guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_edit_requests' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE attendance_edit_requests
      ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
      ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;
END $$;

-- ── CLUBS: rename active → is_active for consistency with our queries ──
-- (The component code uses is_active; the original schema used active)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clubs' AND column_name = 'active'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clubs' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE clubs RENAME COLUMN active TO is_active;
  END IF;
END $$;

-- ── CLASSES: add is_active column if missing ──────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE classes ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
END $$;
