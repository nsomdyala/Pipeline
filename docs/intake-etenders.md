# eTenders intake (M3)

## What shipped

- Shared `SourceAdapter` interface (`src/lib/intake/types.ts`)
- Core pipeline: fetch → normalise → dedupe (ocid) → lane/panel match → upsert → `#opportunities` notify
- eTenders OCDS adapter (`src/lib/intake/adapters/etenders/`)
- Opportunity fields: `opportunityType`, `isPanel`, panel metadata, `externalId`, relevance flags
- Seeded ICT **RFQ** + ICT **PANEL** demo cards
- Board: **PANEL** badge, type filter (All / Panels / RFQs / Tenders), **Run eTenders now**

## Category field (verified on live OCDS)

| Field | Role |
|---|---|
| **`tender.category`** | **Official eTenders SA label** (e.g. `Computer programming, consultancy and related activities`). Always populated in samples. **Primary for lane mapping.** |
| `tender.mainProcurementCategory` | Coarse OCDS: `goods` / `services` / `works` — too broad |
| `tender.additionalProcurementCategories` | Same coarse codes (`consultingServices`, …) |
| `tender.classification` | Always `null` on eTenders in practice |

## Lane matching

1. **Primary:** `tender.category` → Settings `categoryLaneMap` (defaults: ICT + solar/electrical set)
2. **Fallback:** keyword lists (Asset management stays keyword-led)
3. Board defaults to our mapped categories, **all provinces**; multi-select filters for both
4. All Tenders can reach every category; defaults are only pre-selected

## All Tenders search

- **Opportunities board** = curated (`inPipeline=true`) filtered by default eTenders categories
- **All Tenders** (`/tenders`) = full stored release set
- Lane is a tag, never an inclusion filter for storage
- Promote via **Add to pipeline** on any search row
- Edit category map under **Settings → eTenders category → lane map**
- File-store search today; Postgres GIN ready in `docs/sql/tenders-search-index.sql`

## How to test

1. Sign in (`password Pipeline`) → **Opportunities**
2. Confirm seeded cards:
   - `ocds-9t57fa-demo-ict-rfq` (RFQ)
   - `ocds-9t57fa-demo-ict-panel` with mint **PANEL** badge
3. Click **Panels** filter — only panel cards
4. Click **Run eTenders now** (needs network) — refreshes official `tender.category` labels + re-matches lanes
5. On Opportunities: default category chips = our set; provinces default to all
6. Open **All Tenders** — defaults pre-selected; choose **All categories** to search everything
7. **Settings → eTenders category → lane map** to add/remove categories
8. Open **Chat** / live rail → `#opportunities` for `PANEL ·` / new match posts

## API

```bash
# Status
curl -s http://localhost:3000/api/intake/etenders -b cookies.txt

# Manual run (logged-in session cookie, or no CRON_SECRET)
curl -s -X POST http://localhost:3000/api/intake/etenders \
  -H 'Content-Type: application/json' \
  -d '{"dateFrom":"2026-07-01","dateTo":"2026-08-03"}'

# Cron-style (public path; set CRON_SECRET in prod)
curl -s 'http://localhost:3000/api/cron/intake/etenders' \
  -H "x-cron-secret: $CRON_SECRET"
```

Schedule every 4–6h via Vercel Cron → `GET /api/cron/intake/etenders`.

## Adding SITA / Eskom later

Implement `SourceAdapter` in `src/lib/intake/adapters/<name>/` and call `runIntake(adapter)` — do not put source URLs in the pipeline.
