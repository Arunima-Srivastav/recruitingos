# Recruiting OS

**An AI-powered opportunity pipeline for students**

Recruiting OS helps students manage the end-to-end recruiting process by converting scattered recruiting-related information into a structured opportunity pipeline.

Students get recruiting information from everywhere: Gmail, LinkedIn, job postings, OAs, interview scheduling, follow-ups, rejections, offers. This app ingests those messages, extracts structured data, classifies pipeline stage, generates next actions and draft replies, and surfaces what matters **today**.

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
- Gmail import with scan preview and selective import (read-only OAuth)
- Discover page with public job boards (SimplifyJobs, Remotive, Arbeitnow)
- Calendar view with iCal export and Google Calendar two-way sync
- Supabase Auth (email/password) with per-user data isolation via RLS
- Demo data seed endpoint (requires sign-in)

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
| `OLLAMA_MODEL` | Optional Mistral-family override (default `ministral-3:3b`). Gemma and other models are not used. |

Gmail import also requires:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | e.g. `http://localhost:3000/api/auth/google/callback` |
| `NEXT_PUBLIC_APP_URL` | e.g. `http://localhost:3000` |

Find Supabase values under **Project Settings → API**.

### 3. Set up the database and auth

In your Supabase project:

1. Open **Authentication → Providers** and enable **Email** (disable email confirmation for local dev if you want instant sign-in).
2. Open **SQL Editor** and run the full contents of [`supabase/schema.sql`](supabase/schema.sql). This creates:

- `opportunities`: company, role, stage, deadlines, priority
- `messages`: raw text plus extracted JSON
- `actions`: pending tasks linked to opportunities
- `drafts`: generated reply templates
- `google_connections`: Gmail OAuth tokens (per user)

The schema includes **per-user RLS** policies (`auth.uid()::text = user_id`). Each signed-in user only sees their own rows.

If you already ran an older `schema.sql` with open MVP policies, also run:

- [`supabase/migrations/002_gmail.sql`](supabase/migrations/002_gmail.sql): Gmail tables and message fields
- [`supabase/migrations/003_auth_rls.sql`](supabase/migrations/003_auth_rls.sql): replace MVP policies with user-scoped RLS

**Note:** Data created under the old `demo-user` id will not appear after you sign in with a real account.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then **Sign in** (or create an account) to access the pipeline, intake, Gmail, and Today views.

### 5. Verify the build (optional)

```bash
npm run build
npm start
```

## Seed demo data

Sign in first, then click **Load Demo Data** on the homepage. It calls `POST /api/seed` and redirects you to `/pipeline` with five sample opportunities.

The seed endpoint is idempotent: if five or more opportunities already exist for your account, it skips re-seeding.

## Core user flow

1. **Dashboard** (`/`): overview stats and quick links (sign in required for stats)
2. **Sign in** (`/login`): email/password auth
3. **Add Message** (`/intake`): paste message → Ollama extraction → review → save
4. **Gmail** (`/gmail`): connect Gmail → scan → preview → import selected messages
5. **Discover** (`/discover`): browse public job boards → add roles to pipeline
6. **Pipeline** (`/pipeline`): kanban board grouped by stage
7. **Today** (`/today`): prioritized pending actions
8. **Calendar** (`/calendar`): deadlines and action due dates, export to `.ics`
9. **Opportunity detail** (`/opportunities/[id]`): stage updates, drafts, actions, messages

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
    db.ts             # Supabase data access (scoped to signed-in user)
    config.ts         # Env var validation
    auth/             # getCurrentUser, requireUser, API error helpers
    supabase/         # Browser, server, and middleware Supabase clients
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
| `/api/auth/google/start` | GET | Start Gmail OAuth |
| `/api/auth/google/callback` | GET | OAuth callback |
| `/api/gmail/status` | GET | Gmail connection status |
| `/api/gmail/scan` | POST | Scan inbox for recruiting messages |
| `/api/gmail/import` | POST | Import selected messages through Ollama |
| `/api/gmail/disconnect` | POST | Disconnect Gmail |
| `/api/discover/sources` | GET | List configured job board sources |
| `/api/discover/listings` | GET | Search listings from a source |
| `/api/discover/import` | POST | Import selected listings to pipeline |
| `/api/calendar/export` | GET | Download `.ics` for deadlines and due dates |
| `/api/calendar/events` | GET | Month view data (recruiting + Google events) |
| `/api/calendar/sync` | POST | Push recruiting deadlines/actions to Google Calendar |
| `/api/calendar/status` | GET | Google Calendar connection and sync status |

## Discover job boards

The **Discover** page pulls from multiple public sources:

| Source | Type | Notes |
|--------|------|-------|
| Simplify · Summer 2026 Internships | Internships | GitHub `listings.json`, updated daily |
| Simplify · New Grad Positions | New grad | GitHub `listings.json` |
| Greenhouse · Target Companies | General | Public boards API (Stripe, Figma, Databricks, and more) |
| Himalayas · Remote Jobs | Remote | [Himalayas public API](https://himalayas.app/jobs/api) |
| Jobicy · Remote Jobs | Remote | [Jobicy API](https://jobi.cy/apidocs) (attribution required) |
| Remotive · Remote Jobs | Remote | Public Remotive API (software category) |
| Arbeitnow · Job Board | General tech | Free public API, filtered to tech roles |

Search by company, role, or location, select listings, then **Add selected to pipeline**. Use **Load more listings** to paginate when nothing matches on the first page. Imports are deduped by listing ID so the same job is not added twice.

Discover imports map structured API fields directly to your pipeline (no LLM). Ollama/Mistral is only used for recruiter message extraction on Intake and Gmail.

To add another board later, create a new adapter in `src/lib/discover/sources/` and register it in `sources/index.ts`.

## Calendar & Google sync

The **Calendar** page shows a built-in month grid with:

- **Indigo**: everything in Recruiting OS (pipeline deadlines, actions, and events you create)
- **Gray**: Google Calendar events not yet in your pipeline

**Pipeline panel**: only **Recruiter Chat**, **Interview Scheduling**, and related recruiter-call / interview actions (not OA deadlines or the full pipeline). New stage **Recruiter Chat** covers initial sourcing (“book a time”, intro calls).

**Remove from calendar**: pipeline dates, custom events, and Google-synced items can be removed from the day detail panel (clears the date and removes from Google if synced).

**Google → pipeline**: click a gray Google event on a day, then **Add to pipeline** to create an opportunity + action from it.

**Connect Google Calendar** on the Calendar page requests Gmail + Calendar OAuth scopes (existing Gmail users are prompted for calendar access only). Then **Sync to Google Calendar** pushes your recruiting deadlines and pending action due dates into your primary Google Calendar. Re-sync updates changed dates and removes events for completed or deleted items.

You can still **Download .ics** for Apple Calendar, Outlook, or manual import.

Run [`supabase/migrations/004_calendar_sync.sql`](supabase/migrations/004_calendar_sync.sql) and [`005_user_calendar_events.sql`](supabase/migrations/005_user_calendar_events.sql) in Supabase SQL Editor if upgrading an existing database.

In Google Cloud Console, enable the **Google Calendar API** alongside Gmail API for the same OAuth client.

Optional export query params:

- `?opportunity_id=<uuid>`: events for one opportunity
- `?action_id=<uuid>`: one action due date

## Current limitations

- Gmail is user-triggered scan only (no automatic recurring sync yet)
- Google Calendar sync is manual (click Sync), not real-time webhooks
- Edits made in Google Calendar are shown in the app view but do not update pipeline data
- Extraction falls back to regex/keyword heuristics if Ollama fails or is not configured
- Draft generation is template-based, not AI-generated
- Scheduling availability in drafts is placeholder text
- If Supabase env vars are missing, pages show a setup banner instead of crashing

## Ollama setup

1. Sign in at [ollama.com](https://ollama.com)
2. Create an API key under **Settings → Keys**
3. Extraction uses **`ministral-3:3b`** on Ollama Cloud (Mistral family only; Gemma and other models are ignored even if set in env).
4. Add to `.env.local`:

```env
OLLAMA_API_KEY=your-key-here
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=ministral-3:3b
```

5. Restart `npm run dev` after changing env vars

Without `OLLAMA_API_KEY`, intake still works using the heuristic fallback parser.

## Gmail setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create an OAuth 2.0 **Web application** client.
2. Enable the **Gmail API** for your project.
3. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
4. Add to `.env.local`:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. Run `supabase/migrations/002_gmail.sql` and `003_auth_rls.sql` in Supabase SQL Editor (if upgrading an existing DB).
6. **Sign in** to the app, then open **Gmail** → **Connect Gmail** → **Scan Gmail** → select messages → **Import selected**.

OAuth scope: `gmail.readonly` only. Tokens are stored in Supabase per user (RLS-protected, not exposed to the browser).

## Future work

- More discover adapters (Adzuna, Greenhouse public boards, Handshake-style feeds)
- Evaluation harness with labeled test set
- DigitalOcean App Platform deployment

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Missing Supabase configuration" banner | Copy `.env.example` → `.env.local` and set both `NEXT_PUBLIC_*` vars |
| Redirected to `/login` on every page | Sign in or create an account; protected routes require auth |
| Empty pipeline after sign-in | Old `demo-user` data is not linked to your account. Use **Load Demo Data** or add messages |
| Seed or intake returns 401 | Sign in first; API routes require an active session |
| Seed or intake returns 500 | Confirm `schema.sql` (and `003_auth_rls.sql` if upgrading) was run in Supabase SQL Editor |
| Empty pipeline after seed | Check browser console; verify RLS policies exist in Supabase |
| Build fails | Run `npm install` then `npm run build`; ensure Node 20+ |
| Gmail connect fails | Sign in first, then connect; check redirect URI matches Google Console exactly |
| Sign up does nothing | Enable Email provider in Supabase Auth; disable confirmation for local dev if needed |
