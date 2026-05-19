# Recruiting OS

**An AI-powered opportunity pipeline for students**

Recruiting OS helps students manage the end-to-end recruiting process by converting scattered recruiting-related information into a structured opportunity pipeline.

Students receive recruiting information from Gmail, LinkedIn, job postings, OAs, interview scheduling, follow-ups, and rejections/offers. This app ingests those messages, extracts structured data, classifies pipeline stage, generates next actions and draft replies, and shows what matters **today**.

## Tech stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS**
- **Supabase** (Postgres)
- **Next.js API routes** for backend logic
- Mock extraction & draft generation (swap for LLM later)

## MVP features

- Manual message intake (paste email / LinkedIn / job post)
- Heuristic extraction → company, role, stage, deadline, next action
- Supabase-backed opportunities, messages, actions, drafts
- Kanban-style pipeline board with stage updates
- Today view with prioritized pending actions
- Opportunity detail page with messages, JSON, drafts, actions
- Mock draft generation (reply, follow-up, scheduling)
- Demo data seed endpoint

## Supabase setup

1. Open your Supabase project **cs153**.
2. Go to **SQL Editor** → **New query**.
3. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql).
4. Paste and **Run**.

This creates `opportunities`, `messages`, `actions`, and `drafts` tables plus MVP row-level security policies.

## Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find these in Supabase → **Project Settings** → **API**.

See [`.env.example`](.env.example) for a template.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seed demo data

1. Open the homepage.
2. Click **Load Demo Data** (calls `POST /api/seed`).
3. You’ll be redirected to `/pipeline` with sample opportunities.

Or call the API directly:

```bash
curl -X POST http://localhost:3000/api/seed
```

## Core user flow

1. Open app → **Add Message**
2. Paste recruiter message → **Process Message**
3. View extracted opportunity on detail page
4. Generate draft reply / follow-up / scheduling reply
5. Browse **Pipeline** and **Today**
6. Mark actions complete and update stages

## Current limitations

- No real authentication (`demo-user` hardcoded)
- No Gmail or Google Calendar integration
- No real LLM extraction or reply generation
- Heuristic parser may misclassify edge cases
- Scheduling availability is placeholder text

## Future work

- Gmail API ingestion
- Google Calendar integration for real availability
- Google OAuth login
- Real LLM structured extraction (OpenAI, Cloudflare Workers AI, etc.)
- Real LLM reply generation with tone control
- Smarter prioritization and notifications/reminders
- Multi-user auth and per-user RLS policies

## Project structure

```
src/
  app/           # Pages and API routes
  components/    # UI components
  lib/           # Supabase, mock extractors, prioritizer
supabase/
  schema.sql     # Database schema
```

## GitHub

After setup:

```bash
git init   # if not already initialized in this folder
git add .
git commit -m "Build Recruiting OS MVP"
git remote add origin https://github.com/YOUR_USER/recruiting-os.git
git push -u origin main
```
