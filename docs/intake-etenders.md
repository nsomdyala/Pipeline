# eTenders intake (M3)

## What shipped

- Shared `SourceAdapter` interface (`src/lib/intake/types.ts`)
- Core pipeline: fetch → normalise → dedupe (ocid) → lane/panel match → upsert → `#opportunities` notify
- eTenders OCDS adapter (`src/lib/intake/adapters/etenders/`)
- Opportunity fields: `opportunityType`, `isPanel`, panel metadata, `externalId`, relevance flags
- Seeded ICT **RFQ** + ICT **PANEL** demo cards
- Board: **PANEL** badge, type filter (All / Panels / RFQs / Tenders), **Run eTenders now**

## How to test

1. Sign in (`password Pipeline`) → **Opportunities**
2. Confirm seeded cards:
   - `ocds-9t57fa-demo-ict-rfq` (RFQ)
   - `ocds-9t57fa-demo-ict-panel` with mint **PANEL** badge
3. Click **Panels** filter — only panel cards
4. Click **Run eTenders now** (needs network) — pulls publication window since last success (default last 7 days)
5. Open **Chat** / live rail → `#opportunities` for `PANEL ·` / new match posts

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
