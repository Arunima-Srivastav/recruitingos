# Recruiting OS

**An AI-powered opportunity pipeline for students**

Recruiting OS helps students manage the end-to-end recruiting process by converting scattered recruiting-related information into a structured opportunity pipeline.

Students get recruiting information from everywhere: Gmail, LinkedIn, job postings, OAs, interview scheduling, follow-ups, rejections, offers. This app ingests those messages, extracts structured data, classifies pipeline stage, generates next actions and draft replies, and surfaces what matters **today**.

## Tech stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS**
- **Supabase** (Postgres + Auth + RLS)
- **Ollama Cloud** (Mistral `ministral-3:3b`) for message extraction
- **Heuristic fallback** when Ollama is unavailable

## Features

- **Intake**: paste a message → Ollama extraction → review → save to pipeline
- **Gmail**: connect, scan inbox, preview, import selected (read-only OAuth)
- **Discover**: browse public job boards, import to pipeline (no LLM)
- **Pipeline**: kanban by stage, drag cards between columns, stage dropdown per card
- **Today**: prioritized pending actions + dynamic **Needs your reply** section
- **Calendar**: month grid (indigo = Recruiting OS, gray = Google), schedule recruiter calls, Google sync, `.ics` export
- **Dedup**: fuzzy company/role + shared apply URL matching; merge duplicates; auto-link Gmail/Discover imports
- **Priority**: scores on a **1-10** scale (higher = more urgent on Today and pipeline sort)
- **Auth**: Supabase email/password, per-user RLS
- **Drafts**: Ollama (Mistral) reply / follow-up / scheduling with template fallback
- Demo seed data (`POST /api/seed`, sign-in required)

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

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `OLLAMA_API_KEY` | No | Ollama Cloud API key ([ollama.com](https://ollama.com) → Settings → Keys) |
| `OLLAMA_BASE_URL` | No | Default `https://ollama.com` |
| `OLLAMA_MODEL` | No | Mistral-family override only (default `ministral-3:3b`; Gemma ignored) |
| `GOOGLE_CLIENT_ID` | For Gmail/Calendar | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For Gmail/Calendar | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | For Gmail/Calendar | e.g. `http://localhost:3000/api/auth/google/callback` |
| `NEXT_PUBLIC_APP_URL` | For Gmail/Calendar | e.g. `http://localhost:3000` |

### 3. Database and auth

1. **Authentication → Providers**: enable **Email** (disable email confirmation for local dev if you want instant sign-in).
2. **SQL Editor**: run [`supabase/schema.sql`](supabase/schema.sql) for a fresh project.

If upgrading an older database, also run in order:

| Migration | Purpose |
|-----------|---------|
| [`002_gmail.sql`](supabase/migrations/002_gmail.sql) | Gmail fields on messages |
| [`003_auth_rls.sql`](supabase/migrations/003_auth_rls.sql) | Per-user RLS |
| [`004_calendar_sync.sql`](supabase/migrations/004_calendar_sync.sql) | Calendar sync links |
| [`005_user_calendar_events.sql`](supabase/migrations/005_user_calendar_events.sql) | Custom calendar events |
| [`006_user_draft_context.sql`](supabase/migrations/006_user_draft_context.sql) | Resume and highlights for AI drafts |

**Note:** Data under the old `demo-user` id will not appear after you sign in with a real account.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, then use Pipeline, Intake, Gmail, Discover, Today, and Calendar.

### 5. Tests and build (optional)

```bash
npm test
```

Unit tests cover dedup matching, merge rules, apply URL normalization, priority (1-10), needs-reply detection, and calendar title guessing. No live Supabase or Ollama required.

```bash
npm run build
npm start
```

## Core user flow

1. **Home** (`/`): overview and quick links
2. **Sign in** (`/login`): email/password
3. **Add Message** (`/intake`): paste → extract → review → save
4. **Gmail** (`/gmail`): connect → scan → import selected
5. **Discover** (`/discover`): browse boards → import selected
6. **Pipeline** (`/pipeline`): kanban; **drag cards** between columns or use the stage dropdown
7. **Today** (`/today`): prioritized actions and reply detection
8. **Calendar** (`/calendar`): deadlines, Google sync, export
9. **Opportunity** (`/opportunities/[id]`): messages, actions, drafts, merge duplicates

## Priority scoring (1-10)

Priority is an integer from **1** (lowest) to **10** (highest). It drives sort order on **Pipeline** and **Today** and appears on cards as `N/10`.

Signals include: deadline urgency, reply/scheduling/OA needs, active stages (Recruiter Chat, Interviewing), Gmail source, and recency. Inactive stages (Rejected, Ghosted) are pinned to **1**.

Older rows saved before the 1-10 scale may still have larger numbers in the database; the UI normalizes those on display (legacy values are divided by 10). New saves and imports always store 1-10.

## Duplicate detection

- **Discover**: deduped by `discover:{sourceId}:{nativeId}`; also fuzzy match on company + role or shared apply URL before creating a new card
- **Gmail**: same fuzzy linking when company/role matches an existing opportunity
- **Manual intake**: always creates a new opportunity; API returns `possible_duplicates` for review
- **Opportunity detail**: banner to view or **merge** duplicates (messages and actions combined)

## Discover job boards

| Source | Type | Notes |
|--------|------|-------|
| Simplify · Summer 2026 Internships | Internships | GitHub `listings.json` |
| Simplify · New Grad Positions | New grad | GitHub `listings.json` |
| Greenhouse · Target Companies | General | Stripe, Figma, Databricks, and more |
| Himalayas · Remote Jobs | Remote | [Himalayas API](https://himalayas.app/jobs/api) |
| Jobicy · Remote Jobs | Remote | [Jobicy API](https://jobi.cy/apidocs) (attribution required) |
| Remotive · Remote Jobs | Remote | Public API |
| Arbeitnow · Job Board | General tech | Tech-filtered listings |

Imports map API fields directly (no LLM). Add adapters in `src/lib/discover/sources/` and register in `sources/index.ts`.

## Calendar and Google sync

- **Indigo**: Recruiting OS (pipeline deadlines, actions, custom events)
- **Gray**: Google Calendar events not yet in the pipeline
- **Scheduling panel**: Recruiter Chat, Interview Scheduling, and related actions (not full pipeline/OA)
- **Remove from calendar**: clears local date and removes from Google when synced
- **Add to pipeline**: import a gray Google event as an opportunity + action

Enable **Google Calendar API** on the same OAuth client as Gmail. Connect from the Calendar page, then **Sync to Google Calendar**.

## API routes (main)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ai/extract-message` | POST | Ollama/heuristic extraction |
| `/api/intake` | POST | Save reviewed opportunity |
| `/api/seed` | POST | Demo data |
| `/api/drafts/generate` | POST | AI drafts (Ollama Mistral) with template fallback |
| `/api/account/draft-context` | GET, PUT | Resume and highlights for draft generation |
| `/api/account/draft-context/upload` | POST | Parse PDF / text resume upload |
| `/api/opportunities/update-stage` | POST | Change stage |
| `/api/opportunities/duplicates` | GET | List possible duplicates |
| `/api/opportunities/merge` | POST | Merge two opportunities |
| `/api/opportunities/delete` | POST | Delete opportunity |
| `/api/actions/complete` | POST | Complete action |
| `/api/replies` | GET | Needs-reply items for Today/home |
| `/api/gmail/*` | various | Gmail OAuth, scan, import |
| `/api/discover/*` | various | Sources, listings, import |
| `/api/calendar/*` | various | Events, export, sync, schedule |

## Project structure

```
src/
  app/                 # Pages and API routes
  components/          # UI (pipeline, calendar, discover, etc.)
  lib/
    ai/                # Ollama client, extraction prompts
    dedup/             # Match, merge, import linking
    discover/          # Job board adapters
    calendar/          # Events, Google sync
    replies/           # Needs-reply detection
    prioritizer.ts     # 1-10 priority scoring
    db.ts              # Supabase access (requireUser + RLS)
supabase/
  schema.sql
  migrations/
```

## Ollama setup

1. Sign in at [ollama.com](https://ollama.com) and create an API key.
2. Add to `.env.local`:

```env
OLLAMA_API_KEY=your-key-here
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=ministral-3:3b
```

3. Restart `npm run dev`.

Without `OLLAMA_API_KEY`, intake and Gmail import use the heuristic parser.

## Gmail setup

1. [Google Cloud Console](https://console.cloud.google.com/): OAuth **Web application** client.
2. Enable **Gmail API** (and **Calendar API** for calendar features).
3. Redirect URI: `http://localhost:3000/api/auth/google/callback`
4. Sign in to the app → **Gmail** → Connect → Scan → Import selected.

OAuth: `gmail.readonly` for mail; calendar scopes added when syncing calendar.

## Current limitations

- Gmail scan is manual (no background sync)
- Google Calendar sync is manual (no webhooks)
- Google-side edits do not update pipeline data
- Drafts require `OLLAMA_API_KEY` for AI output; otherwise templates are used
- Scheduling availability in drafts is placeholder text

## Draft generation

On an opportunity page, choose tone and generate **Reply**, **Follow-up**, or **Scheduling** drafts. The API calls Ollama Cloud with the same Mistral model as extraction (`ministral-3:3b` by default). If Ollama is missing or errors, a template draft is returned instead. Drafts are never sent automatically.

**Resume and highlights:** On **Account** or the opportunity **Generate draft** section, upload a **PDF**, `.txt`, or `.md` resume (PDF text is extracted on the server), or paste resume text directly. Add bullet points you want emphasized. That context is stored per user and included in AI draft prompts.

Run [`supabase/migrations/006_user_draft_context.sql`](supabase/migrations/006_user_draft_context.sql) when upgrading an existing database.

## Roadmap

- **evaluation**: labeled fixtures + extraction accuracy harness
- **deploy-polish**: DigitalOcean App Platform, production OAuth redirects

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Missing Supabase banner | Set `NEXT_PUBLIC_SUPABASE_*` in `.env.local` |
| Redirected to `/login` | Sign in; protected routes require auth |
| Empty pipeline after sign-in | Old `demo-user` data is orphaned; seed or add messages |
| API 401 | Sign in first |
| API 500 | Run `schema.sql` and migrations in Supabase |
| Gmail connect fails | Redirect URI must match Google Console exactly |
| Priority looks wrong on old data | Re-import or edit stage; new saves use 1-10 |
| Build fails | `npm install`, Node 20+, `npm run build` |
