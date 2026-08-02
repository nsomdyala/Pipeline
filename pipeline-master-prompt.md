# Pipeline — Master Build Prompt (Cursor)

> **How to use this:** open your project in Cursor, start in **Plan mode**, and paste everything below the line. Keep the brand assets in a `/brand` folder at the project root: `pipeline-mark-primary.svg`, `pipeline-mark-inverse.svg`, `pipeline-mark-avatar.svg`, `pipeline-mark-transparent.svg`, `pipeline-CI-sheet.png`, `README.md`.

---

## ROLE

You are a senior full-stack architect and product engineer. First produce a detailed implementation plan (architecture, data model, milestones) and stop for my approval. Then build iteratively — one milestone at a time — with working, runnable code at each step. If a requirement is ambiguous, ask before assuming.

## PRODUCT

**Pipeline** (sub-brand line: *Aura Workstream*) is the internal work operating system for **Max Attention Technologies**, a South African company that bids for public-sector tenders and private-sector work and builds software. Pipeline combines three familiar tools into one:

- **Monday.com** → boards and pipelines for opportunities, leads, sales, active accounts and invoices
- **Slack** → real-time team chat: channels, DMs and threads
- **Discourse** → structured long-form discussion threads attached to opportunities and projects

Plus two things none of those offer:

1. **Opportunity intake from public and private procurement sources**, filtered to our lanes
2. **A compliance document vault + proposal builder** so any team member can assemble a complete bid pack in minutes

Guiding principle: **it must be easy and intuitive** — a new team member should understand it in 10 minutes without training. No screen is more than two clicks from the sidebar.

## OUR LANES (the work we bid for)

- ICT / IT / Information Systems / software development
- Website development, migration and maintenance
- Asset management / asset verification systems
- Solar installation, solar PV, and electrical works

Match across RFQ, RFP, RFT, EOI and open tender types.

## USERS & ROLES

- **Admin / Director** — full access; manages the compliance vault, approves proposals, sees finance
- **Bid team member** — posts/claims opportunities, drafts proposals, chats, books meetings
- **Viewer** — read-only on boards and documents

Small team (2–10 users to start). Multi-user auth, roles, and an activity/audit trail on everything.

---

## CORE MODULES

### 1. Opportunity intake — public + private sources

Build a **pluggable "source adapter" architecture**: one interface (`fetch → normalise → dedupe → match → notify`), one adapter per source, so new sources can be added without touching the core. Each adapter declares: source name, sector (public/private), base URL, fetch method (API where one exists, otherwise responsible rate-limited + cached scraping), and a parser mapping its fields onto our common Opportunity schema. A scheduled job runs every 4–6 hours. Deduplicate by reference number across all sources; flag amendments/errata against existing cards; tag every card with its source.

**Public-sector sources** (implement the free/public ones first):

- **National Treasury eTenders** — https://www.etenders.gov.za (also etenders.treasury.gov.za). Central portal for national, provincial and municipal tenders and RFQs. Free to browse; check for a public JSON/API feed before scraping. **Primary source.**
- **SITA (State IT Agency)** — https://www.sita.co.za/content/invitations. Its own RFQ Bulletin, "New RFQ Invitations" and "Search RFQs". **Highest value for our ICT / IS / software / website lanes** — prioritise this adapter.
- **CSD (Central Supplier Database) RFQ notifications** — informal RFQs (quotes, typically under R1m) go to registered suppliers via CSD, not a public board. Provide an **email-in inbox** that parses CSD RFQ emails into Opportunity cards. Many of our smaller asset-verification, website and electrical jobs arrive this way.
- **Provincial treasury portals** — Gauteng, Western Cape, KwaZulu-Natal, Mpumalanga, etc. (configurable list).
- **Municipal / metro procurement pages** — City of Johannesburg, Ekurhuleni, Tshwane, City of Cape Town, eThekwini (configurable; JHB metros first given our base).
- **State-owned entity portals** — Eskom Tender Bulletin (https://www.eskom.co.za/tenders/), Transnet eTenders, SANRAL, PRASA, ACSA, Telkom, SABC, Rand Water, Umgeni Water, DBSA, NHLS. **Eskom, Transnet and the water utilities are the priority for our solar and electrical lane.**
- **Government Tender Bulletin** — for cross-checking references and catching notices missing from eTenders.

**Private-sector sources** (be realistic — most private work is invited or relationship-based, so weight this toward a curated watchlist + strong capture, not a broad scraper):

- **SAP Business Network Discovery** (formerly SAP Ariba Discovery) — https://www.sap.com/products/business-network/discovery — a genuinely public marketplace where buyers post sourcing needs (RFPs/RFIs/RFQs) and suppliers respond for free. Register as a supplier and set category alerts for our lanes; provide an adapter/email-in to pull matched postings into Pipeline. **Primary private-sector source.**
- **Corporate & OEM supplier portals watchlist** — a configurable list of vendor/procurement portals for target corporates and clients (banks, retailers, mining houses, solar EPCs, IT distributors). Store login/registration status per portal and let us log opportunities seen there manually; where a portal exposes a public "current opportunities" page, add a light adapter.
- **News / announcement monitoring** — an RSS/keyword monitor over SA business news and company newsrooms for signals like "issues RFP", "seeks contractor", "solar rollout", "digitisation project" in our lanes, surfaced as **early-stage leads** (not confirmed opportunities).
- **Manual capture + referrals** — a fast "Post opportunity" form and the same email-in inbox for private RFQs that arrive by email or through a contact. Private wins are relationship-driven, so make it trivial to log a lead against a company/contact in the CRM.

Regardless of source, each matched item becomes an **Opportunity card** capturing: reference/RFQ number, buyer/client, sector (public/private), source, title, description, lane, closing date & time, briefing session (date, compulsory yes/no, venue/link), estimated value if stated, document links, and source URL. A keyword + category engine scores each item for relevance per lane (configurable keyword lists, e.g. "asset verification", "website migration", "solar PV", "electrical reticulation"). New matches notify in-app and into a `#opportunities` chat channel.

### 2. Pipeline board (Monday-style)

- Kanban + table views through stages: `Spotted → Reviewing → Bid/No-Bid → Drafting → Submitted → Awarded → Active account → Closed (Won/Lost)`.
- Each card: owner, **closing-date countdown (turns coral when < 3 working days)**, checklist of required returnables, value, win probability, linked documents, linked chat thread, source/sector tags.
- Linked boards for **Leads** (business development, incl. private-sector signals), **Sales**, **Active accounts** (won work in delivery) and **Invoices** (invoice no., client, amount, issued/due dates, status: draft/sent/paid/overdue — overdue in coral).
- Drag-and-drop between stages; filters by lane, sector, source, owner, closing date; a dashboard with totals: open opportunities, submitted value, win rate, outstanding invoices.

### 3. Compliance vault

- Secure library of standard company compliance documents: SARS Tax Clearance / Letter of Good Standing (with tax compliance PIN), CSD registration report, director ID, director proof of address, company proof of address, B-BBEE certificate/affidavit, COR14.3 / CIPC docs, bank confirmation letter, plus custom types.
- Each document has: type, issue date, **validity/expiry rule** (proofs of address valid 3 months; tax clearance 12 months; CSD report per policy), and computed status: **Valid / Expiring soon (14 days) / Expired**.
- Expiry engine sends reminders (in-app + `#compliance-alerts` channel) before documents lapse.
- One-click **"Download bid pack"**: pick an opportunity, tick the compliance docs to include, get one merged PDF or ZIP, with a warning if any included document is expired or past its validity window.
- Versioned: a new upload supersedes but never deletes the old one (audit trail).

### 4. Proposal builder

- Reusable template blocks (company profile, methodology, team CVs, pricing schedule).
- Create a proposal from an opportunity — pre-fill reference, buyer, closing date, and our company details (name, reg no, CSD number) from a company-profile settings page.
- Rich-text section editing with placeholder tokens (`{{TENDER_NO}}`, `{{CLIENT}}`, `{{CLOSING_DATE}}`) resolved on export.
- Export to **DOCX and PDF**; option to bundle with the compliance pack into one submission ZIP.
- Draft → review → approved workflow with comments.

### 5. Chat (Slack-style)

- Real-time (WebSockets) channels, DMs, threads, @mentions, reactions, file sharing.
- Auto-created channels: `#general`, `#opportunities`, `#compliance-alerts`; plus a channel/thread **auto-linked to every opportunity card** so discussion lives next to the work.
- Unread indicators, notifications, message search.

### 6. Discussions (Discourse-style)

- Long-form topic threads with categories (Strategy, Lessons learned, Product, Admin), rich text, replies, pinning, and solved/decision marking — for conversations that shouldn't vanish up a chat scroll. Any opportunity or project can spawn a linked topic.

### 7. Calendar & meetings

- Shared team calendar: meetings, **tender briefing sessions and closing deadlines auto-populated from opportunity cards**.
- Book a meeting: title, attendees, date/time, video link, agenda, reminders (in-app + chat).
- Views: month/week/day, plus an agenda list of "next 7 days of deadlines and briefings".
- (Phase 2: Google Calendar / Outlook sync — design the model so it can be added.)

### 8. Documents & search

- Every opportunity/project has a Documents tab: RFQ files, proposal versions, pricing sheets, appointment letters, SLAs, invoices — uploaded, previewed, versioned, downloadable.
- Global search across documents, cards, chat and discussions.

---

## TECH STACK (proposed — challenge it in your plan if you have better reasoning)

- **Next.js 14+ (App Router) + TypeScript**, Tailwind CSS
- **PostgreSQL** via **Supabase** (auth, row-level security, document storage, realtime) — or Prisma + managed Postgres if you argue for it
- WebSockets / Supabase Realtime for chat and live board updates
- Background jobs: a scheduled worker (cron route / Supabase Edge Function / node-cron) for the intake adapters and the expiry engine
- DOCX/PDF generation via the `docx` package + a PDF pipeline; ZIP via `archiver`
- Email-in via an inbound-email service (e.g. a webhook from a mail provider) feeding the intake parser
- Deployable to Vercel + Supabase cloud; runnable locally with one command

---

## VISUAL IDENTITY (non-negotiable — assets in `/brand`, match `pipeline-CI-sheet.png` exactly)

- **Mark:** three bars advancing left to right (a bid moving through the stages). **The mint bar is the live stage — never recolour it.** Clear space = one bar-height on all sides; minimum size 16 px. Use `pipeline-mark-primary.svg` by default, `-inverse` on dark/photo surfaces, `-avatar` for favicons/avatars, `-transparent` on light surfaces.
- **Colours:** Navy `#0D1F33` (surfaces, sidebar, wordmark) · Mint `#1FC79C` (live stage, primary actions) · Coral `#FF7A6B` (overdue / at-risk / expired **only**) · Mist `#EEF3F6` (app background) · Ink `#0F2233` (body text) · Muted `#5D7488` (secondary text).
- **Type:** Sora — wordmark Semibold, −3.5% tracking, sentence case; UI 400/600. **IBM Plex Mono** for data — references, values, timestamps, and uppercase labels with 0.11em tracking.
- **Layout:** navy sidebar, mist canvas, white cards, generous whitespace. Set all of this up as **design tokens (CSS variables / Tailwind theme) before building any screens.**

## UX PRINCIPLES

- Intuitive first: sensible defaults, empty states that teach.
- **The closing date is the most important number in the system** — always visible, always counting down, coral when at risk.
- Mobile-responsive throughout (the team checks opportunities from phones).
- South African context: dates `dd MMM yyyy`, currency ZAR (R), timezone Africa/Johannesburg.

---

## PLAN MODE — DELIVER THIS FIRST, THEN STOP

1. Architecture diagram (described in text) and final stack decision with reasons.
2. Full database schema (tables, key columns, relationships) covering all 8 modules, incl. the source/sector fields on Opportunity.
3. The intake approach **per source** (eTenders, SITA, CSD email-in, SOE portals, SAP Business Network Discovery, corporate-portal watchlist, news monitor): exact endpoints or scraping strategy, the shared source-adapter interface, matching logic, cross-source deduplication, and failure handling when a source is down.
4. Screen map / route list with the sidebar structure.
5. Milestone plan, each shippable and demoable, in this order:
   - **M1** Auth, roles, app shell, sidebar, design tokens + brand implementation
   - **M2** Opportunity cards + Pipeline board (manual posting + email-in first)
   - **M3** Public intake adapters (eTenders + SITA first, then one SOE) + matching + notifications
   - **M4** Compliance vault + expiry engine + bid-pack download
   - **M5** Proposal builder with DOCX/PDF export
   - **M6** Real-time chat
   - **M7** Discussions
   - **M8** Calendar & meetings + deadline auto-population
   - **M9** Leads / Sales / Accounts / Invoices boards + dashboard
   - **M10** Private-sector intake (SAP Business Network Discovery + corporate-portal watchlist + news monitor)
   - **M11** Global search, polish, seed data, deployment guide
6. Risks and open questions you need answered before M1.

## RULES DURING BUILD

- One milestone per iteration; each ends with run instructions and a short "what to click to test" note.
- Seed realistic demo data spanning sources: a SAQA asset-verification RFQ and a GEP website-migration RFQ (eTenders), a software/ICT RFQ (SITA), a solar/electrical tender (Eskom or provincial), and a private-sector RFP (SAP Business Network Discovery) — each tagged with its source and sector.
- Never hard-code secrets; use `.env.example`. Respect each source's terms of use; rate-limit and cache all scrapers.
- Clean, typed, commented code; small components; accessibility basics (labels, contrast, keyboard nav).
- When a requirement is ambiguous, ask before assuming.
