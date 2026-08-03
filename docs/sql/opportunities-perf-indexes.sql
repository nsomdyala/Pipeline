-- Performance indexes for All Tenders / board filters.
-- Safe to re-run.

CREATE INDEX IF NOT EXISTS opportunities_is_panel_idx
  ON opportunities (is_panel);

CREATE INDEX IF NOT EXISTS opportunities_stage_idx
  ON opportunities (stage);

CREATE INDEX IF NOT EXISTS opportunities_owner_name_idx
  ON opportunities (owner_name);

CREATE INDEX IF NOT EXISTS opportunities_created_at_idx
  ON opportunities (created_at);

CREATE INDEX IF NOT EXISTS opportunities_pipeline_category_closing_idx
  ON opportunities (in_pipeline, category, closing_at);

CREATE INDEX IF NOT EXISTS opportunities_search_text_gin
  ON opportunities
  USING gin (to_tsvector('english', coalesce(search_text, '')));
