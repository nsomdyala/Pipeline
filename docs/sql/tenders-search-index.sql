-- Ready for Supabase / Postgres when intake moves off the file store.
-- Searchable columns + GIN full-text index for All Tenders.

-- ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS search_text text;
-- ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS in_pipeline boolean NOT NULL DEFAULT false;

-- Keep search_text in sync from title, description, buyer, ref_no, external_id, province, category
-- (app already writes `searchText` on upsert).

CREATE INDEX IF NOT EXISTS opportunities_search_text_gin
  ON opportunities
  USING gin (to_tsvector('english', coalesce(search_text, '')));

CREATE INDEX IF NOT EXISTS opportunities_closing_at_idx
  ON opportunities (closing_at);

CREATE INDEX IF NOT EXISTS opportunities_external_id_uidx
  ON opportunities (external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS opportunities_in_pipeline_idx
  ON opportunities (in_pipeline)
  WHERE in_pipeline = true;
