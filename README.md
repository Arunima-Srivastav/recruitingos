# Recruiting OS

**An AI-powered opportunity pipeline for students**

Recruiting OS helps students manage the end-to-end recruiting process by converting scattered recruiting-related information into a structured opportunity pipeline.

Students get recruiting information from everywhere — Gmail, LinkedIn, job postings, OAs, interview scheduling, follow-ups, rejections, offers. This app ingests those messages, extracts structured data, classifies pipeline stage, generates next actions and draft replies, and surfaces what matters **today**.

## Tech stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS**
- **Supabase** (Postgres)
- **Next.js API routes** for backend logic
- **Heuristic fallback extraction** when Ollama is unavailable
- **Ollama Cloud** for structured message extraction (with review step)

## MVP features

- Manual message intake (paste email / LinkedIn / job post)
- Ollama Cloud extraction with review/edit before saving
- Heuristic fallback when Ollama is not configured or fails
- Supabase-backed opportunities, messages, actions, and drafts
- Kanban-style pipeline board with stage updates
- Today view with prioritized pending actions
- Opportunity detail page with messages, extracted JSON, drafts, and actions
- Mock draft generation for replies, follow-ups, and scheduling
- Demo data seed endpoint

## Prerequisites

- Node.js 20+
- npm
- A [Supabase](https://supabase.com) project (free tier is fine)

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/Arunima-Srivastav/recruitingos.git
cd recruitingos
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

Optional for AI extraction (falls back to heuristics without these):

| Variable | Description |
|----------|-------------|
| `OLLAMA_API_KEY` | API key from [ollama.com](https://ollama.com) → Settings → Keys |
| `OLLAMA_BASE_URL` | Ollama Cloud API host (default: `https://ollama.com`) |
| `OLLAMA_MODEL` | Cloud model from your API (`curl https://ollama.com/api/tags`) — default `ministral-3:3b` |

Find Supabase values under **Project Settings → API**.

### 3. Set up the database

In your Supabase project, open **SQL Editor** and run the full contents of [`supabase/schema.sql`](supabase/schema.sql). This creates:

- `opportunities` — company, role, stage, deadlines, priority
- `messages` — raw text plus extracted JSON
- `actions` — pending tasks linked to opportunities
- `drafts` — generated reply templates

The MVP uses open RLS policies for demo access (`demo-user`). Replace with real auth before production.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Verify the build (optional)

```bash
npm run build
npm start
```

## Seed demo data

Click **Load Demo Data** on the homepage, which calls `POST /api/seed` and redirects you to `/pipeline` with five sample opportunities. Or call it directly:

```bash
curl -X POST http://localhost:3000/api/seed
```

The seed endpoint is idempotent: if five or more opportunities already exist, it skips re-seeding.

## Core user flow

1. **Dashboard** (`/`) — overview stats and quick links
2. **Add Message** (`/intake`) — paste message → Ollama extraction → review fields → save to pipeline
3. **Pipeline** (`/pipeline`) — kanban board grouped by stage
4. **Today** (`/today`) — prioritized pending actions
5. **Opportunity detail** (`/opportunities/[id]`) — stage updates, drafts, actions, original messages

## Project structure

```
src/
  app/              # Pages and API routes
    api/ai/extract-message/  # POST Ollama extraction
    api/intake/       # POST save reviewed opportunity
    api/seed/         # POST demo data
    api/drafts/       # POST mock draft generation
    intake/           # Manual message paste
    pipeline/         # Kanban board
    today/            # Prioritized actions
    opportunities/    # Detail view
  components/         # UI components
  lib/
    mockExtractor.ts  # Heuristic fallback parser
    ai/               # Ollama client, schemas, extraction
    mockDraftGenerator.ts
    prioritizer.ts
    db.ts             # Supabase data access
    config.ts         # Env var validation
supabase/
  schema.sql          # Database schema
```

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ai/extract-message` | POST | Extract fields with Ollama (or heuristic fallback) |
| `/api/intake` | POST | Save reviewed extraction to pipeline |
| `/api/seed` | POST | Load demo opportunities |
| `/api/drafts/generate` | POST | Generate mock reply draft |
| `/api/opportunities/update-stage` | POST | Move opportunity to a new stage |
| `/api/actions/complete` | POST | Mark action as completed |

## Current limitations

- No real authentication (`demo-user` is hardcoded)
- No Gmail or Google Calendar integration yet
- Extraction falls back to regex/keyword heuristics if Ollama fails or is not configured
- Draft generation is template-based, not AI-generated
- Scheduling availability in drafts is placeholder text
- If Supabase env vars are missing, pages show a setup banner instead of crashing

## Ollama setup

1. Sign in at [ollama.com](https://ollama.com)
2. Create an API key under **Settings → Keys**
3. List models your key can access: `curl https://ollama.com/api/tags -H "Authorization: Bearer $OLLAMA_API_KEY"`. We default to **`ministral-3:3b`** (smallest/cheapest in most accounts).
4. Add to `.env.local`:

```env
OLLAMA_API_KEY=your-key-here
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=ministral-3:3b
```

5. Restart `npm run dev` after changing env vars

Without `OLLAMA_API_KEY`, intake still works using the heuristic fallback parser.

## Future work

- Google OAuth + Gmail import with review screen
- Google Calendar / iCal export
- Discover page for public GitHub job sources (e.g. SimplifyJobs)
- Evaluation harness with labeled test set
- DigitalOcean App Platform deployment

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Missing Supabase configuration" banner | Copy `.env.example` → `.env.local` and set both `NEXT_PUBLIC_*` vars |
| Seed or intake returns 500 | Confirm `schema.sql` was run in Supabase SQL Editor |
| Empty pipeline after seed | Check browser console; verify RLS policies exist in Supabase |
| Build fails | Run `npm install` then `npm run build`; ensure Node 20+ |
