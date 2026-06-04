# Recruiting OS

Recruiting OS is a recruiting command center for students and young professionals that turns scattered recruiting emails, job posts, recruiter messages, deadlines, interviews, and follow-ups into a structured opportunity pipeline with prioritized next actions and draft replies.

This repository is my **CS 153 final project**, focused on using AI tools to scale an individual student's recruiting workflow from scattered inbox threads and job-board tabs into one place where deadlines, stages, and next steps stay visible.


|                    |                                                     |
| ------------------ | --------------------------------------------------- |
| **Project status** | Active student project                              |
| **Track**          | Application / Product + Automation                  |
| **Course**         | CS 153 Final Project                                |
| **Primary user**   | Students applying to internships and new-grad roles |


**Repo:** [github.com/Arunima-Srivastav/recruitingos](https://github.com/Arunima-Srivastav/recruitingos)

---

## Table of contents

1. [Problem & Motivation](#1-problem--motivation)
2. [Solution Overview](#2-solution-overview)
3. [Key Features](#3-key-features)
4. [Demo Flow](#4-demo-flow)
5. [Technical Architecture](#5-technical-architecture)
6. [Evaluation & Evidence](#6-evaluation--evidence)
7. [Impact & Use Cases](#7-impact--use-cases)
8. [What I Would Add Next](#8-what-i-would-add-next)
9. [AI Usage Disclosure](#9-ai-usage-disclosure)
10. [Setup & Reproducibility](#10-setup--reproducibility)
11. [Environment Variables](#11-environment-variables)
12. [Known Limitations](#12-known-limitations)
13. [Development Notes / Project Process](#13-development-notes--project-process)

**Reference appendices** (detailed docs for developers and graders):

- [Pipeline stages](#pipeline-stages)
- [Priority scoring (1–10)](#priority-scoring-110)
- [Duplicate detection](#duplicate-detection)
- [Discover job boards](#discover-job-boards)
- [Calendar and Google sync](#calendar-and-google-sync)
- [API routes](#api-routes-main)
- [Data model](#data-model)
- [Ollama setup](#ollama-setup)
- [Gmail setup](#gmail-setup)
- [Draft generation](#draft-generation)
- [Production deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## 1. Problem & Motivation

Students applying to internships and new-grad roles manage recruiting across **Gmail**, **job boards**, **LinkedIn**, **spreadsheets**, **calendars**, **notes**, and **recruiter chats**. The bottleneck is not finding jobs; rahter, I would say it is **keeping track of what each opportunity needs next**.

Common failure modes:

- Missing an **OA deadline** buried in email
- Forgetting to **reply** to a recruiter who asked for availability
- Losing context when the same company appears in Gmail, LinkedIn, and a job board
- No single view of **stage** (applied, OA, interview, offer, rejected) across dozens of threads

Existing tools tend to be **too generic** (task managers), **too manual** (spreadsheets), or **designed for company-side applicant tracking** rather than student-side recruiting.

**Recruiting OS** treats recruiting as an **operating system problem**: unify incoming information, extract structure, prioritize next actions, and reduce cognitive load so students can focus on preparing applications and interviews instead of reconstructing state from scattered messages.

---

## 2. Solution Overview

Recruiting OS is a web app that gives each student a **personal recruiting pipeline**:

1. **Capture** — Paste a recruiting message, import from Gmail, browse public job boards, or add opportunities manually.
2. **Extract** — Parse messages into structured fields (company, role, stage, deadline, recruiter contact, next action) using an LLM when configured, with a heuristic fallback.
3. **Organize** — View opportunities on a kanban **Pipeline** by stage; drag cards or use stage dropdowns.
4. **Prioritize** — Score opportunities **1–10** from deadlines, stage, pending replies, and recency; surface urgent work on **Today**.
5. **Act** — Complete actions, generate **draft replies** (reply / follow-up / scheduling), and sync deadlines to **Calendar** (local + optional Google).

Integrations expand the loop: **Gmail** (scan and import recruiting mail), **Google Calendar** (export/sync events), and **Discover** (import listings from public job-board APIs). Auth and per-user data isolation use **Supabase** email/password sign-in with row-level security.

---

## 3. Key Features

Implementation status labels: **Implemented** = works end-to-end locally with normal setup and **Planned** = not started in this repo.

### Manual Opportunity Intake : **Implemented**

- Add recruiting opportunities via **Intake** (`/intake`): paste message text → extract → review → save.
- Opportunities store company, role, stage, deadline, source, notes, priority, and related metadata.
- Manual intake always creates a new card; the API may return `possible_duplicates` for review.

### Pipeline Dashboard : **Implemented**

- Kanban view at `/pipeline` organized by stage (New → Recruiter Chat → … → Rejected / Ghosted).
- Drag cards between columns or change stage via dropdown; stage updates recalculate priority.
- Opportunity detail pages (`/opportunities/[id]`) show messages, actions, drafts, and duplicate merge.

### Today / Next Actions : **Implemented**

- `/today` lists prioritized pending **actions** (OA, reply, interview prep, follow-up, etc.).
- **Needs your reply** section detects threads waiting on the student (via reply-detection logic).
- Completing actions updates the pipeline and Today view.

### Priority Scoring : **Implemented**

- Integer score **1 (lowest) – 10 (highest)** on pipeline cards and Today.
- Signals include deadline urgency, active stages (Recruiter Chat, Interviewing, OA Pending), reply/scheduling needs, Gmail source, and recency.
- Inactive stages (**Rejected**, **Ghosted**) pin to minimum priority **1**.

### Message Extraction : **Implemented** (heuristic); **Implemented** (LLM)

- **Heuristic parser** (`[src/lib/mockExtractor.ts](src/lib/mockExtractor.ts)`): always available offline; used when Ollama is unset or fails.
- **LLM extraction** (`[src/lib/ai/extract.ts](src/lib/ai/extract.ts)`): Ollama Cloud (Mistral `ministral-3:3b` by default) via `POST /api/ai/extract-message`; validates JSON with Zod, maps AI stages to pipeline stages, falls back to heuristic on low confidence or errors.
- Used on Intake and Gmail import paths. Human review step on Intake before save.

### Draft Replies : **Implemented** (with optional AI)

- Generate **Reply**, **Follow-up**, or **Scheduling** drafts on opportunity pages (`POST /api/drafts/generate`).
- With `OLLAMA_API_KEY`: Ollama Mistral drafts using message + opportunity context + optional resume/highlights from Account.
- Without Ollama: template-based fallback drafts.
- Drafts are **never sent automatically**; copy/edit and send from your mail client.

### Gmail Integration : **Implemented**

- OAuth flow: `/api/auth/google/start` → callback; tokens stored in `google_connections`.
- `/gmail`: connect → **Scan** inbox → preview → **Import selected** (read-only `gmail.readonly` scope).
- Requires Google Cloud OAuth client + env vars (see [Gmail setup](#gmail-setup)).
- **Not production-ready sync**: scan is **manual** (no background polling or webhooks).

### Google Calendar Integration : **Implemented**

- `/calendar`: month grid --> **indigo** = Recruiting OS events; **gray** = Google events not yet in pipeline.
- Schedule recruiter calls / interviews; **Sync to Google Calendar**; export `.ics`; import gray Google events into pipeline.
- Requires same OAuth client with **Calendar API** enabled.
- **Not production-ready sync**: manual sync only; Google-side edits do not update pipeline data.

### Job Discovery / Import : **Implemented** (in-progress sourcing layer)

- `/discover`: browse public job boards, paginate listings, import selected into pipeline.
- Sources include Simplify internship/new-grad lists, Greenhouse target companies, Himalayas, Jobicy, Remotive, Arbeitnow (see [Discover job boards](#discover-job-boards)).
- Dedup by source ID and fuzzy company/role/URL matching.

### Authentication : **Implemented**

- Supabase **email/password** sign-in (`/login`).
- Protected routes via middleware; API routes use `requireUser()`; **RLS** isolates rows per user.

### Persistence : **Implemented**

- **Supabase** (Postgres) stores:


| Entity            | Table                  | Purpose                                             |
| ----------------- | ---------------------- | --------------------------------------------------- |
| Opportunities     | `opportunities`        | Pipeline cards                                      |
| Messages          | `messages`             | Raw + extracted bodies, Gmail metadata              |
| Actions           | `actions`              | To-dos for Today                                    |
| Drafts            | `drafts`               | Generated reply text                                |
| Google connection | `google_connections`   | OAuth tokens, calendar sync flags                   |
| Calendar links    | `calendar_event_links` | Pipeline item ↔ Google event ID                     |
| Custom events     | `user_calendar_events` | User-created calendar entries                       |
| Draft context     | `user_draft_context`   | Resume + highlights for AI drafts (migration `006`) |


### Other implemented capabilities

- **Dedup / merge**: fuzzy company/role + apply-URL matching; merge duplicates on opportunity detail.
- **Demo seed data**: Home → **Load Demo Data** or `POST /api/seed` (sign-in required).
- **Account** (`/account`): resume upload (PDF/text), highlight bullets, sign-out, Gmail shortcut.

---

## 4. Demo Flow

Use this path for a **CS 153 demo video** or local walkthrough. Steps marked **(optional)** need extra env configuration.


| Step | What to show                                                                     | Status                                     |
| ---- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| 1    | Sign in at `/login` (Supabase email/password)                                    | **Required**; Supabase                     |
| 2    | Home → **Load Demo Data** (or `POST /api/seed`)                                  | **Required**; Supabase                     |
| 3    | **Intake**: paste a recruiting message → extract → review fields → save          | **Required**; Ollama optional              |
| 4    | **Pipeline**: card appears in correct stage; drag or change stage                | **Required**                               |
| 5    | **Today**: prioritized actions + **Needs your reply**                            | **Required**                               |
| 6    | **Opportunity detail**: complete an action; **Generate draft** (reply/follow-up) | **Required**; Ollama optional for AI draft |
| 7    | **Discover**: browse a board → import listing → card on Pipeline                 | **Required**; network                      |
| 8    | **Account**: upload/paste resume + highlights for draft context                  | **Required**; migration `006`              |
| 9    | **Gmail**: connect → scan → import selected messages                             | Google OAuth                               |
| 10   | **Calendar**: view events, sync to Google, export `.ics`                         | Google OAuth + Calendar API                |


**Core user flow (page map):**

1. **Home** (`/`): overview, quick links, Load Demo Data
2. **Sign in** (`/login`)
3. **Add Message** (`/intake`)
4. **Gmail** (`/gmail`) — optional
5. **Discover** (`/discover`)
6. **Pipeline** (`/pipeline`)
7. **Today** (`/today`)
8. **Calendar** (`/calendar`) — optional
9. **Opportunity** (`/opportunities/[id]`)
10. **Account** (`/account`)

---

## 5. Technical Architecture

### Stack


| Layer           | Technology                                                    |
| --------------- | ------------------------------------------------------------- |
| Frontend        | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend         | Next.js API routes                                            |
| Database / Auth | Supabase (Postgres, email auth, RLS)                          |
| LLM             | Ollama Cloud (Mistral `ministral-3:3b`)                       |
| Integrations    | Google OAuth, Gmail API, Google Calendar API                  |


### Core logic (`src/lib/`)


| Area           | Location                               | Role                                |
| -------------- | -------------------------------------- | ----------------------------------- |
| Extraction     | `ai/extract.ts`, `mockExtractor.ts`    | LLM + heuristic message parsing     |
| Prioritization | `prioritizer.ts`                       | 1–10 urgency scoring                |
| Drafts         | `ai/draft.ts`, `mockDraftGenerator.ts` | AI + template reply generation      |
| Dedup          | `dedup/`                               | Match, merge, import linking        |
| Discover       | `discover/`                            | Job board adapters                  |
| Calendar       | `calendar/`                            | Events, iCal export, Google sync    |
| Replies        | `replies/detect.ts`                    | Needs-reply detection               |
| Evaluation     | `evaluation/`                          | Labeled fixtures + accuracy harness |
| DB access      | `db.ts`, `supabase/`                   | `requireUser()`, RLS-aware queries  |


### Folder map

```
src/
  app/                 # Pages and API routes
  components/          # UI (pipeline, calendar, discover, etc.)
  lib/                 # Core business logic (see table above)
  middleware.ts        # Auth gate for protected routes
scripts/
  eval-extract.ts      # CLI extraction accuracy report
supabase/
  schema.sql           # Consolidated baseline schema
  migrations/          # Incremental migrations (006 required for draft context)
public/                # Static assets
```

Protected pages and API routes require Supabase auth; row isolation enforced by RLS policies in `[supabase/schema.sql](supabase/schema.sql)`.

---

## 6. Evaluation & Evidence

### What I evaluated

- Can opportunities be **entered and displayed** correctly (manual intake, Discover import, seed data)?
- Can recruiting messages be **transformed into structured fields** (company, role, stage, action, deadline)?
- Does **priority scoring** surface urgent opportunities on Pipeline and Today?
- Do **draft workflows** reduce effort replying (AI + template fallback)?
- Can **Gmail / Calendar / Discover** support the intended end-to-end loop when configured?

### Current evidence

- **Manual testing** across common scenarios: OA invitation, interview scheduling, recruiter intro, rejection, offer/follow-up, generic job posting, Needs Reply outreach.
- **62 automated unit tests** across 30 suites (`npm test`) — offline, no Supabase/Ollama/Google required.
- **Extraction evaluation harness** with 8 labeled fixtures; heuristic regression gate **≥75%** field accuracy in CI-style test run.
- **Iteration** reflected in commit history: auth/RLS, Gmail, calendar sync, discover sources, dedup, evaluation fixtures, draft context.

### Commands


| Command                       | What it runs                                         | External services        |
| ----------------------------- | ---------------------------------------------------- | ------------------------ |
| `npm test`                    | All unit tests + extraction regression (62 tests)    | None                     |
| `npm run eval:extract`        | Heuristic parser accuracy report on labeled fixtures | None                     |
| `npm run eval:extract:ollama` | Same report using live Ollama                        | `OLLAMA_API_KEY`         |
| `npm run lint`                | ESLint                                               | None                     |
| `npm run build`               | Production Next.js build (TypeScript check)          | None                     |
| `npm start`                   | Serve production build locally                       | Supabase if pages hit DB |


**Pre-release checklist:**

```bash
npm test
npm run eval:extract
npm run lint
npm run build
```

Then `npm run dev`, sign in, and walk through the [manual smoke test](#manual-smoke-test).

**Continuous integration:** No GitHub Actions workflow is checked in yet. Tests run locally via `npm test`. Example CI job:

```yaml
# .github/workflows/test.yml (example)
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm test
      - run: npm run eval:extract
      - run: npm run lint
      - run: npm run build
```

Ollama eval (`eval:extract:ollama`) is optional in CI; requires secret `OLLAMA_API_KEY`.

### Unit test coverage

`npm test` runs across `src/lib/**/*.test.ts`:


| Module             | File(s)                              | What is tested                         |
| ------------------ | ------------------------------------ | -------------------------------------- |
| Dedup : match      | `dedup/match.test.ts`                | Company/role/URL duplicate detection   |
| Dedup : merge      | `dedup/merge.test.ts`                | Stage/deadline/source merge rules      |
| Dedup : normalize  | `dedup/normalize.test.ts`            | Fuzzy company/role matching            |
| Dedup : URLs       | `dedup/urls.test.ts`                 | Apply URL extraction/normalization     |
| Priority           | `prioritizer.test.ts`                | 1–10 scoring, inactive stage cap       |
| Needs reply        | `replies/detect.test.ts`             | Reply detection for Today              |
| Calendar           | `calendar/pipeline.test.ts`          | Stage/company from Google event titles |
| Drafts             | `ai/draft.test.ts`                   | Draft body sanitization                |
| Draft context      | `draftContext.test.ts`               | Resume/highlight trimming              |
| Resume parsing     | `resume/parseResumeFile.test.ts`     | PDF/text upload parsing                |
| Extraction eval    | `evaluation/extraction.eval.test.ts` | Heuristic ≥75% on fixtures             |
| Extraction scoring | `evaluation/score.test.ts`           | Fixture scorer logic                   |


### Extraction evaluation 

Message extraction turns raw recruiting text into structured pipeline data. The harness compares extractor output to **human-labeled ground truth**.

**Code:** `[src/lib/evaluation/](src/lib/evaluation/)`


| File                                                                                        | Purpose                             |
| ------------------------------------------------------------------------------------------- | ----------------------------------- |
| `[fixtures/recruiting-messages.json](src/lib/evaluation/fixtures/recruiting-messages.json)` | 8 labeled message fixtures          |
| `[score.ts](src/lib/evaluation/score.ts)`                                                   | Field-by-field scoring              |
| `[extraction.eval.test.ts](src/lib/evaluation/extraction.eval.test.ts)`                     | Regression gate (≥75% heuristic)    |
| `[scripts/eval-extract.ts](scripts/eval-extract.ts)`                                        | CLI report (`npm run eval:extract`) |


Each fixture includes `id`, `description`, optional `sourceType`, `rawText`, and `expected` labels. Five fixtures overlap demo seed messages; three cover edge cases (Needs Reply, Offer, CodeSignal).

**Fixture catalog:**


| ID                     | Source   | Scenario                          | Pipeline stage       |
| ---------------------- | -------- | --------------------------------- | -------------------- |
| `databricks-recruiter` | LinkedIn | Recruiter asks to schedule a call | Recruiter Chat       |
| `stripe-oa`            | Gmail    | HackerRank OA with deadline       | OA Pending           |
| `google-waiting`       | Gmail    | Post-interview "still deciding"   | Interviewing         |
| `meta-rejected`        | Gmail    | Rejection after interviews        | Rejected             |
| `anthropic-final`      | Gmail    | Final round scheduling            | Interview Scheduling |
| `needs-reply-interest` | LinkedIn | "Would you be interested?"        | Needs Reply          |
| `offer-congrats`       | Gmail    | Offer with decision deadline      | Offer                |
| `codesignal-oa`        | Gmail    | CodeSignal assessment             | OA Pending           |


**Scoring rules:**


| Field                                                        | Match rule                        |
| ------------------------------------------------------------ | --------------------------------- |
| `company`, `role_title`, `recruiter_email`, `recruiter_name` | Case-insensitive fuzzy substring  |
| `stage`, `action_type`                                       | Exact match                       |
| `has_deadline`                                               | Boolean — any deadline extracted? |
| `is_time_sensitive`                                          | Exact boolean                     |


**Metrics:** field accuracy, fixture pass rate, regression threshold (**75%** heuristic minimum in `npm test`).

**Last heuristic run** (`npm run eval:extract`):


| Metric               | Result                              |
| -------------------- | ----------------------------------- |
| Field accuracy       | **100.0%** (47 / 47 labeled fields) |
| Fixture pass rate    | **100%** (8 / 8)                    |
| Regression threshold | **pass** (≥75%)                     |


Re-run `npm run eval:extract` after changing fixtures or `[mockExtractor.ts](src/lib/mockExtractor.ts)` — numbers may shift.

**Ollama (live AI) evaluation:** `npm run eval:extract:ollama` uses the same fixtures but calls live Ollama; **50%** CLI threshold (vs 75% heuristic). Recorded Ollama benchmarks are not committed — requires `OLLAMA_API_KEY` in `.env.local`.

**Adding a fixture:** Edit `[recruiting-messages.json](src/lib/evaluation/fixtures/recruiting-messages.json)`, run `npm run eval:extract`, confirm `npm test` passes.

### Manual smoke test

After `npm run dev` with Supabase configured:


| Step | Page / action         | Verify                                    | Requires                    |
| ---- | --------------------- | ----------------------------------------- | --------------------------- |
| 1    | `/login`              | Sign up or sign in                        | Supabase                    |
| 2    | `/` → Load Demo Data  | Demo pipeline populates                   | Supabase                    |
| 3    | `/intake`             | Paste → extract → save → card on Pipeline | Supabase; Ollama optional   |
| 4    | `/pipeline`           | Drag card; change stage dropdown          | Supabase                    |
| 5    | `/today`              | Actions + Needs your reply                | Supabase                    |
| 6    | `/discover`           | Browse → import → card appears            | Supabase + network          |
| 7    | `/opportunities/[id]` | Messages, complete action, generate draft | Supabase; Ollama optional   |
| 8    | `/account`            | Upload/paste resume + highlights          | Supabase + migration `006`  |
| 9    | `/gmail`              | Connect → scan → import                   | Google OAuth                |
| 10   | `/calendar`           | Events, sync to Google, export `.ics`     | Google OAuth + Calendar API |


**Production build smoke test:**

```bash
npm run build
npm start
```

Sign in and repeat one intake save at [http://localhost:3000](http://localhost:3000).

### Limitations / failure cases

- Ambiguous recruiter messages may extract wrong stage or company — **review before save**.
- Gmail/Calendar require correct OAuth setup and test-user allowlisting in Google Cloud testing mode.
- Heuristic extraction is strong on fixtures but not universal; Ollama results vary by model/API.
- Deduplication can miss near-duplicates or over-link similar roles.
- Some integrations are manual-trigger only, not continuous sync.

---

## 7. Impact & Use Cases

- **High-volume applicants** : Students applying to many internships/new-grad roles can avoid missed deadlines and lost recruiter threads.
- **Less spreadsheet time** : Pipeline + Today replace ad-hoc tracking so prep time goes to applications and interviews.
- **Career centers / student groups** : Could adapt as a lightweight **student-side** tracker (not company ATS).
- **Broader value** : Gives individuals AI-augmented recruiting infrastructure that organizations usually build internally.

---

## 8. What I Would Add Next

- Privacy-preserving **job recommendations**: with explicit user permission, collect opt-in recruiting outcomes and profile signals to recommend roles based on what similar students applied to, interviewed for, and successfully converted
- More reliable **Gmail sync** (scheduled scan, import review queue)
- **Google Calendar** two-way or webhook-based deadline/interview sync
- **Job board ingestion** from more internship lists and company career pages
- User **feedback loop** and analytics (which extractions get edited, time-to-reply)

---

## 9. AI Usage Disclosure

The idea for Recruiting OS came from a real problem I experienced during my own junior-year recruiting process. I was tracking opportunities across Gmail, Google Calendar, spreadsheets, job boards, recruiter messages, and notes, and it was easy to lose track of what needed attention next. I also discussed this problem with other students, and those conversations shaped the feature set: Gmail and Google Calendar integrations because many students already rely on those tools, a Today/Next Actions view to reduce clutter, and structured opportunity tracking to make recruiting feel less scattered.

I planned the core product direction, user workflow, feature set, and roadmap based on this need and those informal user conversations. AI tools were then used as development accelerators, especially for:

- Brainstorming product flows and edge cases
- Speeding up code scaffolding and refactors
- Debugging implementation issues
- Improving UI/design decisions, especially where I wanted help making the product feel cleaner and easier to use
- Understanding external APIs such as Google OAuth, Gmail, Google Calendar, and Supabase without spending hours stuck in documentation
- Drafting the Setup & Reproducibility section of the README

**All final code was reviewed and integrated by me.** I used AI tools to move faster and make better decisions, not as a substitute for understanding or ownership of the project.

**Runtime AI:** Optional Ollama Cloud (Mistral) for message extraction and draft generation; heuristic/template fallbacks when unset.

---

## 10. Setup & Reproducibility

### Prerequisites

- **Node.js 20+**
- **npm**
- **[Supabase](https://supabase.com)** project (free tier works)
- **[Google Cloud](https://console.cloud.google.com)** project — only if using Gmail/Calendar
- **[Ollama Cloud](https://ollama.com)** API key — optional; heuristic fallback if unset

### Install

```bash
git clone https://github.com/Arunima-Srivastav/recruitingos.git
cd recruitingos
npm install
```

### Environment setup

**macOS / Linux:**

```bash
cp .env.example .env.local
```

**Windows (PowerShell or CMD):**

```powershell
copy .env.example .env.local
```

Fill in required variables (see [Environment Variables](#11-environment-variables)).

### Database and auth

1. **Authentication → Providers**: enable **Email** (disable email confirmation for local dev if you want instant sign-in).
2. **Authentication → URL configuration**: add `http://localhost:3000/`** to redirect URLs.
3. **SQL Editor** — run both scripts for a **new** project:


| Script                                                                                             | Required for        | Purpose                                       |
| -------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------- |
| `[supabase/schema.sql](supabase/schema.sql)`                                                       | Everyone            | Core tables, Gmail fields, RLS, calendar sync |
| `[supabase/migrations/006_user_draft_context.sql](supabase/migrations/006_user_draft_context.sql)` | Account / AI drafts | `user_draft_context` table                    |


`[schema.sql](supabase/schema.sql)` is the consolidated baseline (includes migrations `002`–`005`). Migration `**006` is still required** on fresh projects — resume storage is not in `schema.sql`.

**Upgrading an older database:** run missing migrations in order (`002`–`006`). See migration files in `[supabase/migrations/](supabase/migrations/)`.

**Note:** Data under the old `demo-user` id will not appear after signing in with a real account.

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, then use Pipeline, Intake, Gmail, Discover, Today, and Calendar.

### Build / test commands

```bash
npm run build
npm run lint
npm test
npm run eval:extract
npm run eval:extract:ollama   # optional — needs OLLAMA_API_KEY
npm start                     # serve production build
```

### Demo seed data

Home → **Load Demo Data** calls `POST /api/seed` (sign-in required). Creates five sample opportunities if pipeline is empty.

```javascript
// Browser console while signed in:
fetch("/api/seed", { method: "POST" }).then((r) => r.json()).then(console.log)
```

---

## 11. Environment Variables

Only variables referenced in code / `[.env.example](.env.example)`:

### App


| Variable              | Required           | Description                                                                               |
| --------------------- | ------------------ | ----------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | For Gmail/Calendar | Public app URL, e.g. `http://localhost:3000`; used for OAuth redirects and calendar links |


### Supabase


| Variable                        | Required | Description              |
| ------------------------------- | -------- | ------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | **Yes**  | Supabase project URL     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes**  | Supabase anon/public key |


### Google OAuth / Gmail / Calendar


| Variable               | Required           | Description                                                                                                                     |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | For Gmail/Calendar | OAuth 2.0 web client ID                                                                                                         |
| `GOOGLE_CLIENT_SECRET` | For Gmail/Calendar | OAuth client secret                                                                                                             |
| `GOOGLE_REDIRECT_URI`  | For Gmail/Calendar | Must match Google Console, e.g. `http://localhost:3000/api/auth/google/callback` (defaults from `NEXT_PUBLIC_APP_URL` if unset) |


### LLM / Ollama


| Variable          | Required | Description                                                                          |
| ----------------- | -------- | ------------------------------------------------------------------------------------ |
| `OLLAMA_API_KEY`  | No       | Ollama Cloud API key — without it, heuristic extraction and template drafts are used |
| `OLLAMA_BASE_URL` | No       | Default `https://ollama.com`                                                         |
| `OLLAMA_MODEL`    | No       | Mistral-family override; default `ministral-3:3b`                                    |


### Node (implicit)


| Variable   | Description                                                                      |
| ---------- | -------------------------------------------------------------------------------- |
| `NODE_ENV` | Set by Next.js (`production` in prod builds); affects OAuth cookie `secure` flag |


---

## 12. Known Limitations

- **Gmail / Calendar** require external OAuth configuration; integrations are **partially implemented** (manual scan/sync, no webhooks or background jobs).
- **Extraction is not perfect**; ambiguous messages should be user-reviewed on Intake; LLM output varies.
- **Deduplication** across Gmail, Discover, and manual entry can be improved.
- **Drafts** use placeholder scheduling availability text; not auto-sent.
- **Google-side calendar edits** do not update pipeline data.
- **No CI workflow** checked in yet.

---

## 13. Development Notes / Project Process

- The project evolved from a **manual opportunity tracker** toward an integrated **recruiting OS** with extraction, prioritization, and integrations.
- **Design decision:** Focus on the **student-side** recruiting bottleneck (what do I need to do next?) rather than company-side ATS workflows.
- **Design decision:** Combine **structured pipeline data** with **AI-assisted extraction and drafting**, keeping humans in the loop for ambiguous extracted fields (`needs_review`, Intake review step).
- **Design decision:** **Heuristic fallback** everywhere LLM is optional so the app remains usable without API keys.
- Commit history shows iterative additions: schema/RLS, Gmail, calendar, discover adapters, dedup, evaluation harness, draft context.

---

## Reference appendices

### Pipeline stages

Kanban columns and stage dropdowns (in order). Updating stage recalculates priority.


| Stage                    | Typical meaning                                         |
| ------------------------ | ------------------------------------------------------- |
| **New**                  | First touch, not yet actioned                           |
| **Recruiter Chat**       | Scheduling a recruiter call                             |
| **Needs Reply**          | Waiting on your response                                |
| **OA Pending**           | Online assessment to complete                           |
| **Interview Scheduling** | Coordinating interview times                            |
| **Interviewing**         | Interviews in progress or completed; waiting on company |
| **Waiting**              | Applied or idle; no immediate action                    |
| **Offer**                | Offer received                                          |
| **Rejected**             | Closed; rejection                                       |
| **Ghosted**              | Closed; no response                                     |


Inactive stages (**Rejected**, **Ghosted**) pin to minimum priority **1/10**. **Offer** is treated as inactive for needs-reply detection.

### Priority scoring (1–10)

Priority is an integer **1 (lowest) – 10 (highest)**. Drives sort on Pipeline and Today; shown on cards as `N/10`.

Signals: deadline urgency, reply/scheduling/OA needs, active stages, Gmail source, recency. Older rows may have legacy larger numbers; UI normalizes on display (divided by 10). New saves store 1–10.

### Duplicate detection

- **Discover**: deduped by `discover:{sourceId}:{nativeId}`; fuzzy company/role or shared apply URL
- **Gmail**: fuzzy linking when company/role matches existing opportunity
- **Manual intake**: always new card; API returns `possible_duplicates`
- **Opportunity detail**: banner to view or **merge** duplicates

### Discover job boards


| Source                             | Type         | Notes                                                        |
| ---------------------------------- | ------------ | ------------------------------------------------------------ |
| Simplify · Summer 2026 Internships | Internships  | GitHub `listings.json`                                       |
| Simplify · New Grad Positions      | New grad     | GitHub `listings.json`                                       |
| Greenhouse · Target Companies      | General      | Stripe, Figma, Databricks, etc.                              |
| Himalayas · Remote Jobs            | Remote       | [Himalayas API](https://himalayas.app/jobs/api)              |
| Jobicy · Remote Jobs               | Remote       | [Jobicy API](https://jobi.cy/apidocs) (attribution required) |
| Remotive · Remote Jobs             | Remote       | Public API                                                   |
| Arbeitnow · Job Board              | General tech | Tech-filtered listings                                       |


Add adapters in `src/lib/discover/sources/` and register in `sources/index.ts`.

**Attribution:** Jobicy and Himalayas show a footer on `/discover` when selected (`attribution: { label, href }` on `DiscoverSource`).

### Calendar and Google sync

- **Indigo**: Recruiting OS (pipeline deadlines, actions, custom events)
- **Gray**: Google Calendar events not yet in pipeline
- **Scheduling panel**: Recruiter Chat, Interview Scheduling, related actions
- **Remove from calendar**: clears local date and removes from Google when synced
- **Add to pipeline**: import gray Google event as opportunity + action

Enable **Google Calendar API** on the same OAuth client as Gmail. Connect from Calendar page → **Sync to Google Calendar**.

### API routes (main)


| Route                               | Method   | Purpose                          |
| ----------------------------------- | -------- | -------------------------------- |
| `/api/ai/extract-message`           | POST     | Ollama/heuristic extraction      |
| `/api/intake`                       | POST     | Save reviewed opportunity        |
| `/api/seed`                         | POST     | Demo data                        |
| `/api/drafts/generate`              | POST     | AI drafts with template fallback |
| `/api/account/draft-context`        | GET, PUT | Resume and highlights            |
| `/api/account/draft-context/upload` | POST     | Parse PDF/text resume            |
| `/api/opportunities/update-stage`   | POST     | Change stage                     |
| `/api/opportunities/duplicates`     | GET      | List possible duplicates         |
| `/api/opportunities/merge`          | POST     | Merge two opportunities          |
| `/api/opportunities/delete`         | POST     | Delete opportunity               |
| `/api/actions/complete`             | POST     | Complete action                  |
| `/api/replies`                      | GET      | Needs-reply items                |
| `/api/auth/google/start`            | GET      | Begin Google OAuth               |
| `/api/auth/google/callback`         | GET      | OAuth callback                   |
| `/api/gmail/status`                 | GET      | Connection status                |
| `/api/gmail/scan`                   | POST     | Scan inbox                       |
| `/api/gmail/import`                 | POST     | Import selected messages         |
| `/api/gmail/disconnect`             | POST     | Revoke connection                |
| `/api/discover/sources`             | GET      | List job board sources           |
| `/api/discover/listings`            | GET      | Paginated listings               |
| `/api/discover/import`              | POST     | Import listing                   |
| `/api/calendar/events`              | GET      | Calendar events                  |
| `/api/calendar/export`              | GET      | Download `.ics`                  |
| `/api/calendar/sync`                | POST     | Push to Google Calendar          |
| `/api/calendar/schedule`            | POST     | Schedule call/interview          |
| `/api/calendar/status`              | GET      | Calendar connection status       |
| `/api/calendar/remove`              | POST     | Remove event                     |
| `/api/calendar/import-to-pipeline`  | POST     | Import Google event              |


### Data model

See `[supabase/schema.sql](supabase/schema.sql)` and `[006_user_draft_context.sql](supabase/migrations/006_user_draft_context.sql)`. All user-owned rows use `user_id` = `auth.uid()` with **RLS**.

### Ollama setup

1. Sign in at [ollama.com](https://ollama.com) → Settings → Keys.
2. Add to `.env.local`:

```env
OLLAMA_API_KEY=your-key-here
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=ministral-3:3b
```

1. Restart `npm run dev`.

Without `OLLAMA_API_KEY`, intake and Gmail import use the heuristic parser; drafts use templates.

**Message extraction (Ollama)** maps AI stages to pipeline stages:


| AI stage (`ai_stage`)         | Pipeline stage |
| ----------------------------- | -------------- |
| `sourced`, `saved`, `unknown` | New            |
| `applied`                     | Waiting        |
| `recruiter_contact`           | Recruiter Chat |
| `oa`                          | OA Pending     |
| `interview`, `final_round`    | Interviewing   |
| `offer`                       | Offer          |
| `rejected`                    | Rejected       |
| `archived`                    | Ghosted        |


Low confidence or validation failures fall back to heuristic (`extraction_status: fallback`).

### Gmail setup

1. [Google Cloud Console](https://console.cloud.google.com/): OAuth **Web application** client.
2. Enable **Gmail API** and **Google Calendar API**.
3. Redirect URI: `http://localhost:3000/api/auth/google/callback`
4. App → **Gmail** → Connect → Scan → Import selected.
5. If app is in **testing mode**, add your Gmail as a test user.

OAuth scopes: `gmail.readonly` for mail; calendar scopes when syncing calendar.

### Draft generation

On opportunity page: choose tone → generate **Reply**, **Follow-up**, or **Scheduling**. Uses Ollama when configured; otherwise templates. Never auto-sent.

**Resume context:** Account or opportunity draft section — upload PDF/`.txt`/`.md` or paste text; add highlight bullets. Stored in `user_draft_context` (requires migration `006`).

### Production deployment

Planned target: **DigitalOcean App Platform**.

1. **Supabase:** run `schema.sql` + `006_user_draft_context.sql`; add production URL to auth redirect URLs.
2. **Env vars:** all Supabase + `NEXT_PUBLIC_APP_URL` + Google OAuth with **production** redirect URI.
3. **Google Console:** add prod callback alongside localhost.
4. **Deploy:** build `npm run build`, run `npm start`; smoke-test sign-in → intake → pipeline.
5. **Pre-deploy:** run `npm test`, `npm run eval:extract`, `npm run build` locally.

### Troubleshooting


| Problem                       | Fix                                                      |
| ----------------------------- | -------------------------------------------------------- |
| Missing Supabase banner       | Set `NEXT_PUBLIC_SUPABASE_`* in `.env.local`             |
| Redirected to `/login`        | Sign in; protected routes require auth                   |
| Empty pipeline after sign-in  | Old `demo-user` data orphaned; seed or add messages      |
| API 401                       | Sign in first                                            |
| API 500                       | Run `schema.sql` and `006_user_draft_context.sql`        |
| Draft context / Account 500   | Run migration `006`                                      |
| Gmail connect fails           | Redirect URI must match Google Console exactly           |
| Priority wrong on old data    | Re-import or edit stage; new saves use 1–10              |
| Build fails                   | `npm install`, Node 20+, `npm run build`                 |
| Extraction eval fails         | Run `npm run eval:extract`; check `mockExtractor.ts`     |
| `eval:extract:ollama` exits 1 | Set `OLLAMA_API_KEY`; threshold 50% — inspect mismatches |


---

## Tech stack (summary)

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS**
- **Supabase** (Postgres + Auth + RLS)
- **Ollama Cloud** (Mistral `ministral-3:3b`) for extraction and drafts 
- **Heuristic fallback** when Ollama is unavailable
- **Google APIs** (Gmail read, Calendar)

