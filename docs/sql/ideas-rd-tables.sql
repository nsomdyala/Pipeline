-- Additive Ideas & R&D tables.
-- Apply with: psql "$DATABASE_URL" -f docs/sql/ideas-rd-tables.sql
--
-- Idea status: submitted | under_review | approved | in_rd | rejected | parked
-- R&D stage: backlog | researching | prototyping | validating | completed | shelved
-- Chat: ideas.channel_id stores an existing channels.id (kind may be 'idea').
-- Local file blobs live under .data/idea-uploads and .data/rd-uploads (JSON fallback
-- also uses those paths). Metadata rows below mirror opportunity attachment style.

CREATE TABLE IF NOT EXISTS ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  problem text NOT NULL DEFAULT '',
  potential_value text NOT NULL DEFAULT '',
  potential_value_zar numeric(14, 2),
  category text NOT NULL DEFAULT 'Other',
  status text NOT NULL DEFAULT 'submitted',
  submitter_user_id text NOT NULL,
  submitter_name text NOT NULL DEFAULT '',
  reviewer_user_id text,
  reviewer_name text NOT NULL DEFAULT '',
  channel_id text,
  decision_reason text NOT NULL DEFAULT '',
  decided_at timestamptz,
  decided_by_user_id text,
  decided_by_name text NOT NULL DEFAULT '',
  rd_item_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ideas_status_idx ON ideas (status);
CREATE INDEX IF NOT EXISTS ideas_category_idx ON ideas (category);
CREATE INDEX IF NOT EXISTS ideas_submitter_idx ON ideas (submitter_user_id);

CREATE TABLE IF NOT EXISTS idea_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
  user_id text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  comment text NOT NULL DEFAULT '',
  score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idea_reviews_idea_id_idx ON idea_reviews (idea_id);

CREATE TABLE IF NOT EXISTS idea_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
  filename text NOT NULL,
  mime text NOT NULL DEFAULT 'application/octet-stream',
  size integer NOT NULL DEFAULT 0,
  stored_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idea_attachments_idea_id_idx ON idea_attachments (idea_id);

CREATE TABLE IF NOT EXISTS rd_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
  title text NOT NULL,
  stage text NOT NULL DEFAULT 'backlog',
  owner_user_id text,
  owner_name text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium',
  target_date timestamptz,
  effort_notes text NOT NULL DEFAULT '',
  progress_notes text NOT NULL DEFAULT '',
  at_risk boolean NOT NULL DEFAULT false,
  submitter_name text NOT NULL DEFAULT '',
  approved_by_name text NOT NULL DEFAULT '',
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rd_items_stage_idx ON rd_items (stage);
CREATE INDEX IF NOT EXISTS rd_items_idea_id_idx ON rd_items (idea_id);
CREATE INDEX IF NOT EXISTS rd_items_owner_idx ON rd_items (owner_user_id);

CREATE TABLE IF NOT EXISTS rd_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rd_item_id uuid NOT NULL REFERENCES rd_items (id) ON DELETE CASCADE,
  user_id text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rd_assignments_rd_user_uidx
  ON rd_assignments (rd_item_id, user_id);
CREATE INDEX IF NOT EXISTS rd_assignments_user_idx ON rd_assignments (user_id);

CREATE TABLE IF NOT EXISTS rd_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rd_item_id uuid NOT NULL REFERENCES rd_items (id) ON DELETE CASCADE,
  author_user_id text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rd_activity_rd_item_id_idx ON rd_activity (rd_item_id);

CREATE TABLE IF NOT EXISTS rd_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rd_item_id uuid NOT NULL REFERENCES rd_items (id) ON DELETE CASCADE,
  filename text NOT NULL,
  mime text NOT NULL DEFAULT 'application/octet-stream',
  size integer NOT NULL DEFAULT 0,
  stored_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rd_documents_rd_item_id_idx ON rd_documents (rd_item_id);

-- Optional: allow channel kind 'idea' (channels.kind is free text; no DDL required).
-- Demo seed rows are inserted by the app on first Ideas/R&D API hit when tables are empty.
