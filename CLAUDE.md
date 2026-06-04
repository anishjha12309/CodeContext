# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun dev          # Start dev server (hot reload)
bun build        # Production build
bun start        # Run production server

# Code quality (run before committing)
bun check        # Lint + TypeScript check together
bun lint         # ESLint
bun lint:fix     # ESLint with auto-fix
bun typecheck    # tsc --noEmit

# Formatting
bun format:check
bun format:write
```

There are no tests in this repository.

## Architecture

CodeContext is a **Next.js 15 App Router** application for AI-powered code understanding. Users connect GitHub repos, ask questions about their codebase using semantic search, and upload meeting audio for transcription.

### Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript strict
- **API:** tRPC 11 + React Query 5 (all mutations/queries go through tRPC)
- **Auth:** Clerk (middleware at [src/middleware.ts](src/middleware.ts))
- **Database:** Supabase (Postgres + pgvector + file storage)
- **AI:** Groq (LLaMA 3.3-70B for Q&A + Whisper for transcription), Cerebras (llama-4-scout for code summaries), Gemini (text-embedding-001 for vectors)
- **Payments:** Razorpay (INR, 1 INR = 1 credit)
- **Styling:** Tailwind v4, Radix UI primitives, Motion for animations

### Request flow

**Q&A (streaming):** `src/app/(protected)/dashboard/actions.ts:askQuestion()` is a Server Action. It embeds the question via Gemini → pgvector similarity search on `source_code_embeddings` → streams Groq response via `createStreamableValue` → deducts 1 credit atomically via Supabase RPC `decrement_credits`.

**Repo indexing:** Triggered on `createProject` mutation. Runs async via `indexGithubRepo()` in [src/lib/github-loader.ts](src/lib/github-loader.ts): fetch files (batches of 10, max 50 files) → Cerebras summaries (batches of 10) → Gemini embeddings (batches of 25) → insert to `source_code_embeddings`. Rate limits are baked into each batch step.

**Meeting transcription:** Client uploads audio to Supabase Storage via `/api/upload-meeting`, then calls `/api/process-meeting` (5-minute timeout) which runs Groq Whisper → chapter segmentation → stores chapters as `issues` rows.

### tRPC structure

- [src/server/api/trpc.ts](src/server/api/trpc.ts) — context (Clerk userId + Supabase admin client), `protectedProcedure` middleware
- [src/server/api/routers/project.ts](src/server/api/routers/project.ts) — all procedures (createProject, getProjects, getCommits, archiveProject, saveAnswer, getQuestions, meetings CRUD, getTeamMembers, getMyCredits)
- [src/server/api/root.ts](src/server/api/root.ts) — router aggregator

### Database schema (Supabase)

Key tables: `users`, `projects`, `user_to_projects`, `commits`, `questions`, `meetings`, `issues`, `source_code_embeddings` (pgvector), `transactions`. No Prisma — all queries use the Supabase JS client directly. RLS applies to the browser client; the server uses the service-role admin client.

### Route groups

- `src/app/(auth)/` — Clerk sign-in/sign-up pages
- `src/app/(protected)/` — requires auth; layout wraps all pages in collapsible sidebar
- `src/app/api/` — REST endpoints for tRPC, Razorpay, and meeting processing

### Environment variables

See `.env.example`. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `GEMINI_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`. All are validated at startup via `src/env.js` (t3-env).

### Key conventions

- Path alias `@/*` maps to `src/*`
- Active project is persisted in `localStorage` via `useProject` hook ([src/hooks/use-project.ts](src/hooks/use-project.ts))
- Theme toggle stores preference in `localStorage`; `dark` class is set on `<html>`
- Glass-morphism UI classes (`glass-app`, `glass-app-nav`, `glass-app-strong`) are defined in `src/app/globals.css`
- Commit polling uses `pollCommits()` in [src/lib/github.ts](src/lib/github.ts) with a 30 RPM Groq rate limit (2 commits/batch with delays)
