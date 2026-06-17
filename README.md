<div align="center">

# CodeContext

**AI-powered codebase understanding for development teams.**

Ask questions about any GitHub repository in plain English, get instant AI-generated commit summaries, and turn meeting recordings into searchable transcripts — all in one place.

[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React_19-149ECA?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![tRPC](https://img.shields.io/badge/tRPC_11-2596BE?style=flat-square&logo=trpc&logoColor=white)](https://trpc.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white)](https://clerk.com)

</div>

---

## What it does

Connect a GitHub repository and CodeContext will:

1. **Index your codebase** — every source file is summarised by an LLM and stored as a vector embedding
2. **Answer questions** — ask anything in plain English; semantic search finds the relevant files and streams a grounded answer back
3. **Summarise commits** — recent commits are automatically explained in plain language
4. **Transcribe meetings** — upload an audio recording and get an AI-generated chapter breakdown with timestamps

Everything is gated behind a simple credit system and scoped per-project so teams can collaborate without stepping on each other's data.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript (strict) |
| API | tRPC 11 + React Query 5, SuperJSON |
| Auth | Clerk (middleware-protected routes) |
| Database & Storage | Supabase (Postgres + pgvector + file storage) |
| AI — Q&A / commits / chapters | Groq · `llama-3.3-70b-versatile` |
| AI — Code summaries | Cerebras · `gpt-oss-120b` |
| AI — Embeddings | Google Gemini · `gemini-embedding-001` (3072 dims) |
| AI — Transcription | Groq · `whisper-large-v3` |
| Payments | Razorpay (INR, 1 INR = 1 credit) |
| Styling | Tailwind CSS v4, Radix UI, Motion |
| Runtime | Bun |

---

## Features

### Codebase Q&A
Ask questions about your repository in plain English. Each question embeds the query via Gemini, runs a pgvector cosine-similarity search over indexed source files, and streams a context-grounded answer from Groq using React Server Component streaming (`createStreamableValue`). The source files used as context are shown alongside the answer and can be saved to a shared knowledge base.

### Commit Intelligence
Recent commits are polled from GitHub and summarised by LLaMA 3.3-70B, giving every team member a plain-English changelog without reading diffs. Commit polling is rate-limited (2 commits/batch with delays) to stay within Groq's free-tier throughput.

### Meeting Transcription
Upload an audio recording (`.mp3` / `.wav` and other common formats). The file is stored in Supabase Storage, then Groq Whisper transcribes it and the transcript is automatically segmented into named chapters with start/end timestamps — making long meetings easy to navigate.

### Team Collaboration
Invite teammates to a project via a shareable join link (`/join/[projectId]`). Saved Q&A sessions are visible to all members, creating a living knowledge base for the codebase.

### Credit System
- New users start with **150 credits**
- Creating a project costs **50 credits** (atomically deducted, refunded if indexing setup fails)
- Asking a question costs **1 credit**
- Credits are topped up in-app via Razorpay (payments recorded in a `transactions` table)

---

## Architecture

CodeContext is a **Next.js 15 App Router** application. All data mutations and queries flow through tRPC, except the streaming Q&A path which uses a Server Action.

### Request flows

**Q&A (streaming)** — `askQuestion()` in [src/app/(protected)/dashboard/actions.ts](src/app/(protected)/dashboard/actions.ts):
```
question → Gemini embedding → pgvector similarity search (match_source_code RPC)
        → stream Groq answer (createStreamableValue) → deduct 1 credit (decrement_credits RPC)
```

**Repo indexing** — triggered by the `createProject` mutation, runs async via `indexGithubRepo()` in [src/lib/github-loader.ts](src/lib/github-loader.ts). See the pipeline diagram below.

**Meeting transcription** — the client uploads audio to Supabase Storage via [/api/upload-meeting](src/app/api/upload-meeting/route.ts), then calls [/api/process-meeting](src/app/api/process-meeting/route.ts) (5-minute timeout) which runs Groq Whisper → chapter segmentation → stores chapters as `issues` rows.

### tRPC layer

- [src/server/api/trpc.ts](src/server/api/trpc.ts) — request context (Clerk `userId` + Supabase service-role admin client) and the `protectedProcedure` auth middleware
- [src/server/api/routers/project.ts](src/server/api/routers/project.ts) — all procedures: `getMyCredits`, `createProject`, `getProjects`, `getCommits`, `saveAnswer`, `getQuestions`, `deleteQuestion`, `uploadMeeting`, `getMeetings`, `getMeetingById`, `deleteMeeting`, `getTeamMembers`, `archiveProject`
- [src/server/api/root.ts](src/server/api/root.ts) — router aggregator

### Route groups

- `src/app/(auth)/` — Clerk sign-in / sign-up
- `src/app/(protected)/` — authenticated routes (dashboard, qa, meetings, billing, create, join), wrapped in a collapsible sidebar layout
- `src/app/sync-user/` — provisions a `users` row on first login (Clerk redirect target)
- `src/app/api/` — REST endpoints for tRPC, Razorpay, meeting processing, and a health check

---

## How the indexing pipeline works

```
GitHub repo URL
      │
      ▼
Resolve default branch → fetch full file tree
      │
      ▼
Filter files (skip lockfiles, assets, configs, tests, etc.;
              keep up to 50 files, 50 B – 50 KB each)
      │
      ▼
Phase 1 · Fetch file contents (batches of 10, 500 ms apart)
      │
      ▼
Phase 2 · Summarise via Cerebras gpt-oss-120b
          (many files packed into ONE request, paced at ≤5 req/min
           to respect the free-tier 5 RPM / 30K TPM limits)
      │
      ▼
Phase 3 · Generate vector embeddings via Gemini (batches of 25)
      │
      ▼
Phase 4 · Insert into Supabase source_code_embeddings (pgvector, 3072-dim)
          per-row inserts + WAF-block fallback with truncated source
```

All rate limits and retry/back-off (5s → 10s on 429s) are baked into each batch step so a free-tier set of API keys can index a repo without tripping quotas.

---

## Database schema (Supabase)

No ORM — all access uses the Supabase JS client directly. The browser client is subject to RLS; the server uses the service-role admin client. Full schema and RPCs live in [supabase/schema.sql](supabase/schema.sql).

| Table | Purpose |
|---|---|
| `users` | Clerk-synced profiles + credit balance (default 150) |
| `projects` | Connected repositories (soft-deleted via `deleted_at`) |
| `user_to_projects` | Membership join table |
| `commits` | Commits with AI summaries |
| `source_code_embeddings` | Indexed files + `vector(3072)` summary embeddings |
| `questions` | Saved Q&A with file references |
| `meetings` | Uploaded recordings (`PROCESSING` / `COMPLETED` / `FAILED`) |
| `issues` | Meeting chapters generated from transcripts |
| `transactions` | Razorpay payment records |

**RPC functions:** `match_source_code` (cosine similarity search), `set_embedding` (writes the pgvector column after insert), `increment_credits` / `decrement_credits` (atomic balance changes). A public `meetings` storage bucket holds uploaded audio.

---

## Getting started

### Prerequisites

- [Bun](https://bun.sh) (or Node.js ≥ 18)
- A [Supabase](https://supabase.com) project with the `vector` (pgvector) extension
- A [Clerk](https://clerk.com) application
- API keys for [Groq](https://console.groq.com), [Cerebras](https://cloud.cerebras.ai), and [Google AI Studio](https://aistudio.google.com) — all free, no card required
- A [GitHub personal access token](https://github.com/settings/tokens/new) (optional, but needed for private repos / higher rate limits)
- A [Razorpay](https://razorpay.com) account (test mode is free)

### 1. Clone and install

```bash
git clone https://github.com/your-username/codecontext.git
cd codecontext
bun install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

All variables are validated at startup via [src/env.js](src/env.js) (t3-env). Set `SKIP_ENV_VALIDATION=1` to bypass during certain build steps.

| Variable | Required | Description |
|---|:---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon (browser) key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service-role (server) key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ➖ | Defaults to `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ➖ | Defaults to `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` | ➖ | Defaults to `/sync-user` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` | ➖ | Defaults to `/sync-user` |
| `GROQ_API_KEY` | ✅ | Q&A, commit summaries, chapters, Whisper transcription |
| `CEREBRAS_API_KEY` | ✅ | Code summarisation during indexing |
| `GEMINI_API_KEY` | ✅ | Vector embeddings |
| `GITHUB_TOKEN` | ➖ | Required for private repos / higher rate limits |
| `RAZORPAY_KEY_ID` | ✅ | Razorpay key id |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay key secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | ➖ | Razorpay key id exposed to the checkout widget |

### 3. Set up the database

Open the Supabase SQL editor and run [supabase/schema.sql](supabase/schema.sql). It enables pgvector, creates every table, the helper RPCs, and the public `meetings` storage bucket.

### 4. Start the dev server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Development commands

```bash
bun dev           # Start dev server with hot reload
bun build         # Production build
bun start         # Run production server
bun check         # Lint + TypeScript check (run before committing)
bun lint          # ESLint
bun lint:fix      # ESLint with auto-fix
bun typecheck     # tsc --noEmit
bun format:check  # Prettier check
bun format:write  # Prettier write
```

There are no automated tests in this repository.

---

## Project structure

```
src/
├── app/
│   ├── (auth)/                # Clerk sign-in / sign-up
│   ├── (protected)/           # Authenticated routes (sidebar layout)
│   │   ├── dashboard/         # Project overview + commit feed (+ Q&A Server Action)
│   │   ├── qa/                # Saved codebase Q&A
│   │   ├── meetings/          # Meeting upload + transcripts
│   │   ├── billing/           # Credit purchase
│   │   ├── create/            # New project form
│   │   └── join/[projectId]/  # Team invite acceptance
│   ├── sync-user/             # Provisions users row on first login
│   └── api/
│       ├── trpc/[trpc]/       # tRPC handler
│       ├── razorpay/          # create-order + verify-payment
│       ├── upload-meeting/    # Audio upload to Supabase Storage
│       ├── process-meeting/   # Whisper transcription + chaptering
│       └── health/            # Health check
├── server/api/
│   ├── trpc.ts                # Context + protectedProcedure middleware
│   ├── root.ts                # Router aggregator
│   └── routers/project.ts     # All tRPC procedures
├── lib/
│   ├── github-loader.ts       # Repo indexing pipeline
│   ├── github.ts              # Commit polling
│   ├── groq.ts                # LLM Q&A + Whisper transcription
│   ├── cerebras.ts            # Code summarisation
│   ├── gemini.ts              # Vector embeddings
│   └── supabase.ts            # Browser + admin DB clients
├── hooks/
│   └── use-project.ts         # Active project (localStorage)
├── env.js                     # Validated environment variables
└── middleware.ts              # Clerk route protection

supabase/
└── schema.sql                 # Tables, RPCs, storage bucket
```

---

## Key conventions

- Path alias `@/*` maps to `src/*`
- The active project is persisted to `localStorage` via the `useProject` hook
- Theme preference is stored in `localStorage`; the `dark` class is toggled on `<html>`
- Glass-morphism UI classes (`glass-app`, `glass-app-nav`, `glass-app-strong`) are defined in `src/app/globals.css`

---

## License

MIT
