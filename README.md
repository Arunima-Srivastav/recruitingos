# Recruiting OS

**An AI-powered opportunity pipeline for students**

Recruiting OS helps students manage the end-to-end recruiting process by converting scattered recruiting-related information into a structured opportunity pipeline.

Students get recruiting information from everywhere : Gmail, LinkedIn, job postings, OAs, interview scheduling, follow-ups, rejections, offers. This app ingests those messages, extracts structured data, classifies pipeline stage, generates next actions and draft replies, and surfaces what matters **today**.

## Tech stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS**
- **Supabase** (Postgres)
- **Next.js API routes** for backend logic
- Mock extraction & draft generation (swap for LLM later)

## MVP features

- Manual message intake (paste email / LinkedIn / job post)
- Heuristic extraction of company, role, stage, deadline, next action
- Supabase-backed opportunities, messages, actions, and drafts
- Kanban-style pipeline board with stage updates
- Today view with prioritized pending actions
- Opportunity detail page with messages, JSON, drafts, and actions
- Mock draft generation for replies, follow-ups, and scheduling
- Demo data seed endpoint

## Environment variables

Create `.env.local` in the project root (see [`.env.example`](.env.example) for a template):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

These are in Supabase under **Project Settings → API**.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seed demo data

Click **Load Demo Data** on the homepage, which calls `POST /api/seed` and redirects you to `/pipeline` with sample opportunities already populated. Or call it directly:

```bash
curl -X POST http://localhost:3000/api/seed
```

## Core user flow

1. Open app → **Add Message**
2. Paste a recruiter message → **Process Message**
3. View the extracted opportunity on its detail page
4. Generate a draft reply, follow-up, or scheduling response
5. Browse **Pipeline** and **Today**
6. Mark actions complete and update stages as things move

## Current limitations

- No real authentication (`demo-user` is hardcoded)
- No Gmail or Google Calendar integration yet
- Extraction and reply generation are heuristic, not LLM-based
- The heuristic parser will misclassify edge cases
- Scheduling availability is placeholder text

## Future work

- Google OAuth login and multi-user auth with per-user RLS policies
- Google Calendar integration for real scheduling availability
- Real LLM structured extraction and reply generation with tone control
- Smarter prioritization, reminders, and notifications

### Opportunity sourcing 

The MVP only supports **manual paste** intake. Next we want a real **sourcing layer** that feeds the same pipeline:

- **Gmail API** — sync recruiter threads, OAs, scheduling, rejections, and offers into `messages` automatically
- **LinkedIn** — manual paste for now; later export/import or approved integrations where feasible
- **Job posts** — paste or URL capture → extract company, role, and deadlines into new or existing opportunities
- **Deduping & linking** — match incoming messages to existing opportunities (company + role + recruiter) instead of creating duplicates
- **Backfill** — one-time import of a recruiting inbox so students start with a populated pipeline

Sourcing should enqueue work (parse → classify → prioritize) rather than blocking the UI on large imports.

### Compute usage

- **Cloudflare Workers AI** — structured extraction and stage classification on intake (and on each Gmail sync event); on-demand draft generation for replies, follow-ups, and scheduling. Drafts cached in Supabase to avoid repeat inference.
- **DigitalOcean** — async Gmail sync and inbox backfill (poll/webhook worker + queue, batch re-processing). Keeps long jobs off the request path.

Interactive actions stay on the edge; bulk work runs async. The MVP uses heuristics in Next.js API routes with no model calls until this is wired up.

## Project structure

```
src/
  app/           # Pages and API routes
  components/    # UI components
  lib/           # Supabase, mock extractors, prioritizer
supabase/
  schema.sql     # Database schema
```
