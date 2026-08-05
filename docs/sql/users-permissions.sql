-- Users & Permissions (additive)
-- Apply with:
--   psql "$DATABASE_URL" -f docs/sql/users-permissions.sql
--
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- Seeds system roles + Finance viewer demo and their permission matrices.
-- Does NOT alter existing users' roles.

-- ── User lifecycle columns ───────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_token_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;

-- ── Roles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_roles (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text NOT NULL REFERENCES app_roles(key) ON DELETE CASCADE,
  module text NOT NULL,
  action text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_role_mod_act_uidx
  ON role_permissions (role_key, module, action);

-- ── Seed roles ───────────────────────────────────────────────────────
INSERT INTO app_roles (key, name, description, is_system) VALUES
  ('admin', 'Admin / Director', 'Full access to every module, including users and settings.', true),
  ('member', 'Bid team member', 'Day-to-day bid work across pipeline, accounts, and delivery.', true),
  ('viewer', 'Viewer', 'Read-only access across most modules; no Settings edits.', true),
  ('client', 'Client-portal', 'External client access — view own Account and Projects only.', true),
  ('finance_viewer', 'Finance viewer', 'Demo custom role — Dashboard and Invoices/Finance view + export.', false)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  updated_at = now();

-- Helper: wipe + reseed permissions for a role (idempotent seed)
-- Admin: all module/actions
DELETE FROM role_permissions WHERE role_key IN ('admin', 'member', 'viewer', 'client', 'finance_viewer');

INSERT INTO role_permissions (role_key, module, action, allowed)
SELECT 'admin', m.module, a.action, true
FROM (VALUES
  ('dashboard'), ('opportunities'), ('leads'), ('accounts'), ('pmo'),
  ('ideas'), ('compliance'), ('proposals'), ('invoices'), ('chat'),
  ('discussions'), ('calendar'), ('documents'), ('settings')
) AS m(module)
CROSS JOIN (VALUES
  ('view'), ('create'), ('edit'), ('delete'), ('approve'), ('export')
) AS a(action)
WHERE
  (m.module = 'dashboard' AND a.action IN ('view', 'export'))
  OR (m.module = 'settings' AND a.action IN ('view', 'edit'))
  OR (m.module IN ('chat', 'discussions', 'calendar') AND a.action IN ('view', 'create', 'edit', 'delete'))
  OR (m.module = 'ideas' AND a.action IN ('view', 'create', 'edit', 'delete', 'approve'))
  OR (m.module IN ('opportunities', 'pmo', 'proposals', 'invoices') AND a.action IN ('view', 'create', 'edit', 'delete', 'approve', 'export'))
  OR (m.module IN ('leads', 'accounts', 'compliance', 'documents') AND a.action IN ('view', 'create', 'edit', 'delete', 'export'));

-- Member defaults
INSERT INTO role_permissions (role_key, module, action, allowed) VALUES
  ('member', 'dashboard', 'view', true),
  ('member', 'dashboard', 'export', true),
  ('member', 'opportunities', 'view', true),
  ('member', 'opportunities', 'create', true),
  ('member', 'opportunities', 'edit', true),
  ('member', 'opportunities', 'delete', true),
  ('member', 'opportunities', 'export', true),
  ('member', 'leads', 'view', true),
  ('member', 'leads', 'create', true),
  ('member', 'leads', 'edit', true),
  ('member', 'leads', 'delete', true),
  ('member', 'leads', 'export', true),
  ('member', 'accounts', 'view', true),
  ('member', 'accounts', 'create', true),
  ('member', 'accounts', 'edit', true),
  ('member', 'accounts', 'delete', true),
  ('member', 'accounts', 'export', true),
  ('member', 'pmo', 'view', true),
  ('member', 'pmo', 'create', true),
  ('member', 'pmo', 'edit', true),
  ('member', 'pmo', 'export', true),
  ('member', 'ideas', 'view', true),
  ('member', 'ideas', 'create', true),
  ('member', 'ideas', 'edit', true),
  ('member', 'compliance', 'view', true),
  ('member', 'compliance', 'create', true),
  ('member', 'compliance', 'edit', true),
  ('member', 'compliance', 'export', true),
  ('member', 'proposals', 'view', true),
  ('member', 'proposals', 'create', true),
  ('member', 'proposals', 'edit', true),
  ('member', 'proposals', 'export', true),
  ('member', 'invoices', 'view', true),
  ('member', 'invoices', 'export', true),
  ('member', 'chat', 'view', true),
  ('member', 'chat', 'create', true),
  ('member', 'chat', 'edit', true),
  ('member', 'chat', 'delete', true),
  ('member', 'discussions', 'view', true),
  ('member', 'discussions', 'create', true),
  ('member', 'discussions', 'edit', true),
  ('member', 'discussions', 'delete', true),
  ('member', 'calendar', 'view', true),
  ('member', 'calendar', 'create', true),
  ('member', 'calendar', 'edit', true),
  ('member', 'calendar', 'delete', true),
  ('member', 'documents', 'view', true),
  ('member', 'documents', 'create', true),
  ('member', 'documents', 'edit', true),
  ('member', 'documents', 'export', true),
  ('member', 'settings', 'view', true);

-- Viewer: view most modules (no executive Dashboard / PMO / Ideas — preserves prior nav)
INSERT INTO role_permissions (role_key, module, action, allowed)
SELECT 'viewer', m.module, 'view', true
FROM (VALUES
  ('opportunities'), ('leads'), ('accounts'),
  ('compliance'), ('proposals'), ('invoices'), ('chat'),
  ('discussions'), ('calendar'), ('documents'), ('settings')
) AS m(module);

-- Client-portal: view own account/projects (+ light collab)
INSERT INTO role_permissions (role_key, module, action, allowed) VALUES
  ('client', 'accounts', 'view', true),
  ('client', 'pmo', 'view', true),
  ('client', 'documents', 'view', true),
  ('client', 'calendar', 'view', true),
  ('client', 'chat', 'view', true),
  ('client', 'chat', 'create', true),
  ('client', 'discussions', 'view', true),
  ('client', 'discussions', 'create', true);

-- Finance viewer demo custom role
INSERT INTO role_permissions (role_key, module, action, allowed) VALUES
  ('finance_viewer', 'dashboard', 'view', true),
  ('finance_viewer', 'dashboard', 'export', true),
  ('finance_viewer', 'invoices', 'view', true),
  ('finance_viewer', 'invoices', 'export', true);

-- Normalize any null/blank status on existing rows
UPDATE users SET status = 'active' WHERE status IS NULL OR status = '';
