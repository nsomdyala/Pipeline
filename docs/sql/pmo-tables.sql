-- Additive PMO tables (Account → many projects + governance).
-- Account ids are text refs to the JSON accounts store (e.g. acct-innovationhub).
-- Apply with: psql "$DATABASE_URL" -f docs/sql/pmo-tables.sql

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS account_id text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS organisation text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS pmo_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  account_name text NOT NULL DEFAULT '',
  name text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  health text NOT NULL DEFAULT 'green',
  value_zar numeric(14, 2),
  start_on timestamptz,
  due_on timestamptz,
  project_manager_user_id text,
  project_manager_name text NOT NULL DEFAULT '',
  source_opportunity_id text,
  source_lead_id text,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pmo_projects_account_id_idx ON pmo_projects (account_id);
CREATE INDEX IF NOT EXISTS pmo_projects_status_idx ON pmo_projects (status);
CREATE INDEX IF NOT EXISTS pmo_projects_health_idx ON pmo_projects (health);
CREATE INDEX IF NOT EXISTS pmo_projects_pm_idx ON pmo_projects (project_manager_user_id);

CREATE TABLE IF NOT EXISTS pmo_project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES pmo_projects (id) ON DELETE CASCADE,
  user_id text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pmo_project_assignments_project_user_uidx
  ON pmo_project_assignments (project_id, user_id);
CREATE INDEX IF NOT EXISTS pmo_project_assignments_user_idx
  ON pmo_project_assignments (user_id);

CREATE TABLE IF NOT EXISTS pmo_appointment_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES pmo_projects (id) ON DELETE CASCADE,
  letter_date timestamptz,
  reference text NOT NULL DEFAULT '',
  awarded_value_zar numeric(14, 2),
  signatory text NOT NULL DEFAULT '',
  file_id uuid REFERENCES files (id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pmo_slas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES pmo_projects (id) ON DELETE CASCADE,
  term text NOT NULL DEFAULT '',
  service_levels text NOT NULL DEFAULT '',
  penalties text NOT NULL DEFAULT '',
  review_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  file_id uuid REFERENCES files (id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pmo_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES pmo_projects (id) ON DELETE CASCADE,
  po_number text NOT NULL DEFAULT '',
  amount_zar numeric(14, 2),
  po_date timestamptz,
  remaining_balance_zar numeric(14, 2),
  linked_invoice_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  file_id uuid REFERENCES files (id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pmo_charters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES pmo_projects (id) ON DELETE CASCADE,
  objectives text NOT NULL DEFAULT '',
  scope_in text NOT NULL DEFAULT '',
  scope_out text NOT NULL DEFAULT '',
  deliverables text NOT NULL DEFAULT '',
  milestones text NOT NULL DEFAULT '',
  budget_zar numeric(14, 2),
  assumptions text NOT NULL DEFAULT '',
  constraints text NOT NULL DEFAULT '',
  sign_off jsonb,
  file_id uuid REFERENCES files (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pmo_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES pmo_projects (id) ON DELETE CASCADE,
  schedule text NOT NULL DEFAULT '',
  wbs text NOT NULL DEFAULT '',
  resourcing text NOT NULL DEFAULT '',
  budget_plan text NOT NULL DEFAULT '',
  risk_register jsonb NOT NULL DEFAULT '[]'::jsonb,
  quality_approach text NOT NULL DEFAULT '',
  change_control text NOT NULL DEFAULT '',
  file_id uuid REFERENCES files (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pmo_status_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES pmo_projects (id) ON DELETE CASCADE,
  period text NOT NULL DEFAULT '',
  cadence text NOT NULL DEFAULT 'monthly',
  progress text NOT NULL DEFAULT '',
  percent_complete integer NOT NULL DEFAULT 0,
  milestones_hit text NOT NULL DEFAULT '',
  risks_issues text NOT NULL DEFAULT '',
  next_steps text NOT NULL DEFAULT '',
  reported_at timestamptz NOT NULL DEFAULT now(),
  file_id uuid REFERENCES files (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pmo_project_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES pmo_projects (id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
  influence text NOT NULL DEFAULT 'medium',
  interest text NOT NULL DEFAULT 'medium',
  engagement_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pmo_project_stakeholders_project_contact_uidx
  ON pmo_project_stakeholders (project_id, contact_id);

CREATE TABLE IF NOT EXISTS pmo_stakeholder_comms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id uuid NOT NULL REFERENCES pmo_project_stakeholders (id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  channel text NOT NULL DEFAULT 'email',
  summary text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
